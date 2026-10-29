export type Step =
  | "home"
  | "send-code"
  | "send-file"
  | "review"
  | "transfer"
  | "done";
export type ModalType = "settings" | "help";
export type SpeedUnit = "KB/s" | "MB/s" | "GB/s";
export type TransferRole = "sender" | "receiver";
export type FileInfo = { name: string; size: number; type: string };
export type TransferMessage = {
  type: string;
  metadata?: FileInfo;
  message?: string;
};
export type PendingAction = "send" | "receive" | null;
