import type { WebSocket } from "ws";
import type { TransferMetadata } from "./transferMessage.js";
import type { TransferRole, TransferState } from "./transferTypes.js";

export type TransferPeer = {
  id: string;
  socket: WebSocket;
  role: TransferRole;
};
export type TransferRoom = {
  code: string;
  createdAt: number;
  lastActivity: number;
  state: TransferState;
  peers: Map<string, TransferPeer>;
  metadata?: TransferMetadata;
};
