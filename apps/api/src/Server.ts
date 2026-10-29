import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { config } from "./Config.js";
import { EndpointManager } from "./managers/EndpointManager.js";
import { ServerManager } from "./managers/ServerManager.js";
import { SocketManager } from "./managers/SocketManager.js";
import { ClientManager } from "./managers/ClientManager.js";
import { TransferLogManager } from "./managers/TransferLogManager.js";
import { TransferManager } from "./managers/TransferManager.js";
import { initializeClientModel } from "./models/Client.js";
import { createDatabase } from "./models/Database.js";
import { initializeTransferLogModel } from "./models/TransferLog.js";

const transferManager = new TransferManager();
const clientManager = new ClientManager();
const transferLogManager = new TransferLogManager();
const database = createDatabase();
initializeTransferLogModel(database);
initializeClientModel(database);
const application = express();
const httpServer = createServer(application);
const websocketServer = new WebSocketServer({
  server: httpServer,
  path: config.websocketPath,
});

new EndpointManager(application, transferManager, clientManager).Configure();
new SocketManager(
  websocketServer,
  transferManager,
  clientManager,
  transferLogManager,
).Start();
void new ServerManager(
  httpServer,
  database,
  transferManager,
  transferLogManager,
).Start();
