import type { WebSocket } from "ws";

export type LogDetails = Record<string, unknown>;

export type ClientAttributes = {
  clientId: string;
  createdAt?: Date;
  lastConnectedAt?: Date;
};

export type TransferState =
  | "waiting"
  | "transferring"
  | "completed"
  | "expired";

export type TransferRole = "sender" | "receiver";

export type TransferMetadata = {
  name?: unknown;
  size?: unknown;
  type?: unknown;
};

export type TransferMessage = {
  type: string;
  metadata?: TransferMetadata;
  state?: TransferState;
  bytes?: number;
};

export type TransferPeer = {
  id: string;
  socket: WebSocket;
  role: TransferRole;
};

export type TransferRoom = {
  code: string;
  senderId: string;
  createdAt: number;
  lastActivity: number;
  state: TransferState;
  peers: Map<string, TransferPeer>;
  metadata?: TransferMetadata;
};

export type TransferLogAttributes = {
  id?: number;
  transferCode: string | null;
  receiverId: string | null;
  senderId: string | null;
  filename: string | null;
  fileSize: number | null;
  state: TransferState;
  updatedAt?: Date;
};
