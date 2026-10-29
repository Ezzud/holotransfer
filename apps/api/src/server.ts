import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';
import { TransferManager } from './managers/transferManager.js';
import { TransferLogManager } from './managers/transferLogManager.js';
import { createTransferController } from './controllers/createTransferController.js';
import { joinTransferController } from './controllers/joinTransferController.js';
import { createTransferLogController } from './controllers/transferLogController.js';
import type { TransferRole } from './models/transferTypes.js';
import { createDatabase, migrateDatabase } from './models/database.js';
import { initializeTransferLogModel } from './models/TransferLog.js';
import { initializeClientModel } from './models/Client.js';
import { ClientManager } from './managers/clientManager.js';
import { createClientController } from './controllers/clientController.js';
import { logger } from './logger.js';
import { config } from './config.js';

const manager = new TransferManager();
const database = createDatabase();
initializeTransferLogModel(database);
initializeClientModel(database);
const clientManager = new ClientManager();
const transferLogManager = new TransferLogManager();
const logController = createTransferLogController(transferLogManager);
const createController = createTransferController(manager, clientManager);
const joinController = joinTransferController(manager, clientManager);
const clientController = createClientController(clientManager);
const app = express();
const httpServer = createServer(app);
const websocketServer = new WebSocketServer({ server: httpServer, path: config.websocketPath });
const socketHealth = new WeakMap<WebSocket, boolean>();

/**
 * Configures Express middleware and transfer routes.
 * @returns Nothing.
 */
function configureHttp(): void {
  app.use(cors({
    origin: config.allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-client-id'],
    optionsSuccessStatus: 204
  }));
  app.use(express.json({ limit: '16kb' }));
  app.use(createRateLimiter(120));
  app.get('/health', (_request, response) => response.json({ ok: true }));
  app.get(`${config.apiPrefix}/clients`, createRateLimiter(5, 1_000), clientController);
  app.post(`${config.apiPrefix}/transfers`, createRateLimiter(3), createController);
  app.post(`${config.apiPrefix}/transfers/join`, createRateLimiter(3), joinController);
}

/**
 * Creates a JSON rate limiter for consistent frontend error handling.
 * @param limit Maximum requests per minute.
 * @returns Configured rate-limit middleware.
 */
function createRateLimiter(limit: number, windowMs = 60_000) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    handler: (_request, response) => response.status(429).json({ error: 'Too many requests. Try again in a minute.' })
  });
}

/**
 * Starts periodic room cleanup.
 * @returns Nothing.
 */
function scheduleRoomCleanup(): void {
  setInterval(() => manager.expireRooms((room) => {
    logger.warn('Transfer code expired', { code: room.code });
    return logController(room, 'expired');
  }), 60_000).unref();
}

/**
 * Keeps intermediary proxies and long-running WebSocket connections active.
 * @returns Nothing.
 */
function scheduleWebSocketHeartbeat(): void {
  setInterval(() => {
    for (const socket of websocketServer.clients) {
      if (socketHealth.get(socket) === false) {
        socket.terminate();
        continue;
      }
      socketHealth.set(socket, false);
      socket.ping();
    }
  }, 20_000).unref();
}

/**
 * Initializes persistence and starts the API server.
 * @returns A promise that resolves when startup completes.
 */
async function startServer(): Promise<void> {
  configureHttp();
  try {
    await migrateDatabase(database);
    await database.sync();
    await transferLogManager.expireActiveTransfers();
    logger.info(`Database ready`);
  } catch (error) {
    logger.error('Unable to initialize database', error);
    process.exitCode = 1;
    return;
  }
  scheduleRoomCleanup();
  httpServer.listen(config.port, config.host, () => {
    const address = httpServer.address() as AddressInfo;
    logger.info('TransferMaster API listening', {
      host: address.address,
      port: address.port,
      apiPrefix: config.apiPrefix,
      websocketPath: config.websocketPath
    });
  });
}

/**
 * Handles a WebSocket connection for a transfer room.
 * @param socket Connected socket.
 * @param request Upgrade request.
 * @returns Nothing.
 */
async function handleConnection(socket: import('ws').WebSocket, request: import('node:http').IncomingMessage): Promise<void> {
  const url = new URL(request.url ?? '', `http://${request.headers.host}`);
  const code = (url.searchParams.get('code') ?? '').toUpperCase();
  const clientId = url.searchParams.get('client_id');
  const role = url.searchParams.get('role') as TransferRole;
  const room = manager.getRoom(code);
  if (!room || !clientId || !['sender', 'receiver'].includes(role) || room.peers.size >= 2) {
    logger.warn('Rejected WebSocket connection', { code, clientId, role });
    socket.close(4003, 'Invalid transfer');
    return;
  }
  try {
    if (!await clientManager.validateConnection(clientId)) {
      logger.warn('Rejected WebSocket client with unknown client_id', { clientId });
      socket.close(4001, 'Unknown client_id');
      return;
    }
    manager.addPeer(room, { id: clientId, socket, role });
  } catch (error: unknown) {
    logger.error('Unable to validate WebSocket client', error);
    socket.close(1011, 'Client validation failed');
    return;
  }
  logger.info('WebSocket peer connected', { code, clientId, role });
  socketHealth.set(socket, true);
  socket.on('pong', () => socketHealth.set(socket, true));
  socket.send(JSON.stringify({ type: 'connected', role }));
  if (room.peers.size === 2) {
    logger.success('Transfer devices connected', { code });
    manager.relay(room, clientId, JSON.stringify({ type: 'peer-connected' }));
  }
  socket.on('message', (raw, isBinary) => {
    if (isBinary) manager.relay(room, clientId, raw as Buffer);
    else {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === 'metadata') {
          const fileSize = message.metadata?.size;
          if (typeof fileSize !== 'number' || !Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > config.maxTransferSizeBytes) {
            socket.send(JSON.stringify({ type: 'error', message: `Files must be between 1 byte and ${formatBytes(config.maxTransferSizeBytes)}.` }));
            return;
          }
          logger.info('File offered', { code, filename: message.metadata?.name, fileSize });
        }
        if (message.type === 'accepted') logger.success('Transfer confirmed by receiver', { code, clientId });
        if (message.type === 'denied') logger.warn('Transfer refused by receiver', { code, clientId });
        if (message.type === 'sender-disconnected') {
          logger.warn('Sender disconnected; expiring transfer code', { code, clientId });
          void logController(room, 'expired');
          manager.expireRoom(room, 'The sender disconnected. This transfer has ended.');
          return;
        }
        if (message.type === 'keepalive') {
          manager.touchRoom(room);
          return;
        }
        const state = manager.applyMessage(room, message);
        if (state) {
          void logController(room, state);
          if (state === 'completed') logger.success('Transfer completed', { code });
          if (state === 'transferring') logger.info('Transfer started', { code });
        }
        manager.relay(room, clientId, raw.toString());
      }
      catch (error) {
        logger.warn('Malformed WebSocket message', { code, clientId, error });
        socket.send(JSON.stringify({ type: 'error', message: 'Malformed transfer message.' }));
      }
    }
  });
  socket.on('close', (closeCode, closeReason) => {
    if (role === 'sender' && manager.getRoom(code) === room && room.peers.size > 1) {
      logger.warn('Sender connection closed; expiring transfer code', { code, clientId });
      void logController(room, 'expired');
      manager.expireRoom(room, 'The sender disconnected. This transfer has ended.');
      return;
    }
    if (role === 'receiver' && manager.getRoom(code) === room && room.peers.size > 1) {
      logger.warn('Receiver connection closed; expiring transfer code', { code, clientId });
      void logController(room, 'expired');
      manager.expireRoom(room, 'The receiver disconnected. This transfer has ended.');
      return;
    }
    manager.removePeer(room, clientId);
    logger.info('WebSocket peer disconnected', { code, clientId, closeCode, closeReason: closeReason.toString() });
  });
}

websocketServer.on('connection', handleConnection);
scheduleWebSocketHeartbeat();
void startServer();

/**
 * Formats a byte limit for protocol errors.
 * @param bytes Number of bytes.
 * @returns Human-readable byte limit.
 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${bytes / 1024 ** 3} GB`;
  if (bytes >= 1024 ** 2) return `${bytes / 1024 ** 2} MB`;
  if (bytes >= 1024) return `${bytes / 1024} KB`;
  return `${bytes} bytes`;
}
