import type { TransferState } from "./transferTypes.js";

export type TransferMetadata = {
  name?: unknown;
  size?: unknown;
  type?: unknown;
};
export type TransferMessage = {
  type: string;
  metadata?: TransferMetadata;
  state?: TransferState;
};
