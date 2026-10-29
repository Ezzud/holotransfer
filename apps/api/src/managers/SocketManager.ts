import type { IncomingMessage } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import type { RawData } from "ws";
import type { TransferMessage, TransferRole } from "../Types.js";
import { config } from "../Config.js";
import { logger } from "../Logger.js";
import { ClientManager } from "./ClientManager.js";
import { TransferLogManager } from "./TransferLogManager.js";
import { TransferManager } from "./TransferManager.js";

type SocketHealth = {
  missedPongs: number;
  code: string;
  clientId: string;
  role: TransferRole;
};

/**
 * Owns WebSocket connections, relay protocol handling, and heartbeats.
 */
export class SocketManager {
  private readonly transfers: TransferManager;
  private readonly clients: ClientManager;
  private readonly logs: TransferLogManager;
  private readonly sockets: WebSocketServer;
  private readonly health = new WeakMap<WebSocket, SocketHealth>();
  private readonly heartbeatIntervalMs = 20_000;
  private readonly heartbeatMissLimit = 3;

  /**
   * Creates a WebSocket manager.
   * @param sockets WebSocket server.
   * @param transfers Transfer manager.
   * @param clients Client manager.
   * @param logs Transfer log manager.
   */
  public constructor(
    sockets: WebSocketServer,
    transfers: TransferManager,
    clients: ClientManager,
    logs: TransferLogManager,
  ) {
    this.sockets = sockets;
    this.transfers = transfers;
    this.clients = clients;
    this.logs = logs;
  }

  /**
   * Starts WebSocket connection handling and heartbeat monitoring.
   * @returns Nothing.
   */
  public Start(): void {
    this.sockets.on("connection", (socket, request) => {
      void this.HandleConnection(socket, request);
    });
    setInterval(() => this.SendHeartbeats(), this.heartbeatIntervalMs).unref();
  }

  /**
   * Sends heartbeat pings and terminates unresponsive sockets.
   * @returns Nothing.
   */
  private SendHeartbeats(): void {
    for (const socket of this.sockets.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const health = this.health.get(socket);
      if (!health) continue;
      health.missedPongs += 1;
      if (health.missedPongs >= this.heartbeatMissLimit) {
        logger.warn("WebSocket socket terminated by heartbeat timeout", {
          code: health.code,
          clientId: health.clientId,
          role: health.role,
          missedPongs: health.missedPongs,
          timeoutMs: this.heartbeatIntervalMs * this.heartbeatMissLimit,
          action: "terminate",
        });
        socket.terminate();
        continue;
      }
      socket.ping();
    }
  }

  /**
   * Handles a WebSocket connection for a transfer room.
   * @param socket Connected socket.
   * @param request Upgrade request.
   * @returns Promise resolving after validation and event registration.
   */
  private async HandleConnection(
    socket: WebSocket,
    request: IncomingMessage,
  ): Promise<void> {
    const url = new URL(request.url ?? "", `http://${request.headers.host}`);
    const code = (url.searchParams.get("code") ?? "").toUpperCase();
    const clientId = url.searchParams.get("client_id");
    const role = url.searchParams.get("role") as TransferRole;
    const room = this.transfers.getRoom(code);
    if (
      !room ||
      !clientId ||
      !["sender", "receiver"].includes(role) ||
      !this.transfers.canAddPeer(room, clientId, role)
    ) {
      logger.warn("Rejected WebSocket connection", { code, clientId, role });
      socket.close(4003, "Invalid transfer");
      return;
    }
    try {
      if (!(await this.clients.validateConnection(clientId))) {
        logger.warn("Rejected WebSocket client with unknown client_id", {
          clientId,
        });
        socket.close(4001, "Unknown client_id");
        return;
      }
      this.transfers.addPeer(room, { id: clientId, socket, role });
    } catch (error: unknown) {
      logger.error("Unable to validate WebSocket client", error);
      socket.close(1011, "Client validation failed");
      return;
    }
    logger.info("WebSocket peer connected", { code, clientId, role });
    this.health.set(socket, { missedPongs: 0, code, clientId, role });
    socket.on("pong", () => {
      const health = this.health.get(socket);
      if (health) health.missedPongs = 0;
    });
    socket.send(JSON.stringify({ type: "connected", role }));
    if (room.peers.size === 2) {
      logger.success("Transfer devices connected", { code });
      this.transfers.relay(room, clientId, JSON.stringify({ type: "peer-connected" }));
      socket.send(JSON.stringify({ type: "peer-connected" }));
    }
    socket.on("message", (raw, isBinary) => {
      void this.HandleMessage(socket, room, code, clientId, raw, isBinary);
    });
    socket.on("close", (closeCode, closeReason) => {
      this.HandleClose(room, code, clientId, role, closeCode, closeReason.toString());
    });
  }

  /**
   * Handles a text or binary protocol message.
   * @param socket Sending socket.
   * @param room Transfer room.
   * @param code Transfer code.
   * @param clientId Sending client ID.
   * @param raw Raw message.
   * @param isBinary Whether the message is binary.
   * @returns Promise resolving after processing.
   */
  private async HandleMessage(
    socket: WebSocket,
    room: NonNullable<ReturnType<TransferManager["getRoom"]>>,
    code: string,
    clientId: string,
    raw: RawData,
    isBinary: boolean,
  ): Promise<void> {
    if (isBinary) {
      this.transfers.relay(room, clientId, this.ToBuffer(raw));
      return;
    }

    try {
      const message = JSON.parse(raw.toString()) as TransferMessage;
      if (message.type === "metadata") {
        const fileSize = message.metadata?.size;
        if (
          typeof fileSize !== "number" ||
          !Number.isSafeInteger(fileSize) ||
          fileSize <= 0 ||
          fileSize > config.maxTransferSizeBytes
        ) {
          logger.warn("Rejected file metadata without ending transfer session", {
            code,
            clientId,
            fileSize,
            fileSizeType: typeof fileSize,
            configuredMaximum: config.maxTransferSizeBytes,
          });
          socket.send(JSON.stringify({
            type: "metadata-error",
            message: `Files must be between 1 byte and ${this.FormatBytes(config.maxTransferSizeBytes)}.`,
          }));
          return;
        }
        logger.info("File offered", {
          code,
          filename: message.metadata?.name,
          fileSize,
        });
      }
      if (message.type === "accepted")
        logger.success("Transfer confirmed by receiver", { code, clientId });
      if (message.type === "denied")
        logger.warn("Transfer refused by receiver", { code, clientId });
      if (message.type === "sender-disconnected") {
        logger.warn("Sender disconnected; expiring transfer code", { code, clientId });
        void this.logs.record(room, "expired");
        this.transfers.expireRoom(room, "The sender disconnected. This transfer has ended.");
        return;
      }
      if (message.type === "keepalive") {
        this.transfers.touchRoom(room);
        return;
      }
      const state = this.transfers.applyMessage(room, message);
      if (state) {
        void this.logs.record(room, state);
        if (state === "completed") logger.success("Transfer completed", { code });
        if (state === "transferring") logger.info("Transfer started", { code });
      }
      this.transfers.relay(room, clientId, raw.toString());
    } catch (error) {
      logger.warn("Malformed WebSocket message", { code, clientId, error });
      socket.send(JSON.stringify({ type: "error", message: "Malformed transfer message." }));
    }
  }

  /**
   * Converts WebSocket raw data into a relayable buffer.
   * @param raw WebSocket raw data.
   * @returns Buffer containing the raw payload.
   */
  private ToBuffer(raw: RawData): Buffer {
    if (Buffer.isBuffer(raw)) return raw;
    if (Array.isArray(raw)) return Buffer.concat(raw);
    return Buffer.from(raw);
  }

  /**
   * Handles a WebSocket close event.
   * @param room Transfer room.
   * @param code Transfer code.
   * @param clientId Closing client ID.
   * @param role Closing role.
   * @param closeCode WebSocket close code.
   * @param closeReason WebSocket close reason.
   * @returns Nothing.
   */
  private HandleClose(
    room: NonNullable<ReturnType<TransferManager["getRoom"]>>,
    code: string,
    clientId: string,
    role: TransferRole,
    closeCode: number,
    closeReason: string,
  ): void {
    if (room.peers.size > 1) {
      logger.warn(`${role === "sender" ? "Sender" : "Receiver"} connection closed; expiring transfer code`, {
        code,
        clientId,
        closeCode,
        closeReason,
      });
      void this.logs.record(room, "expired");
      this.transfers.expireRoom(
        room,
        `The ${role} disconnected. This transfer has ended.`,
      );
      return;
    }
    this.transfers.removePeer(room, clientId);
    logger.info("WebSocket peer disconnected", { code, clientId, closeCode, closeReason });
  }

  /**
   * Formats a byte limit for protocol errors.
   * @param bytes Number of bytes.
   * @returns Human-readable byte limit.
   */
  private FormatBytes(bytes: number): string {
    if (bytes >= 1024 ** 3) return `${bytes / 1024 ** 3} GB`;
    if (bytes >= 1024 ** 2) return `${bytes / 1024 ** 2} MB`;
    if (bytes >= 1024) return `${bytes / 1024} KB`;
    return `${bytes} bytes`;
  }
}
