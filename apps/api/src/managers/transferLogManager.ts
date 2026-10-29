import type { TransferRoom } from "../models/transferRoom.js";
import type { TransferState } from "../models/transferTypes.js";
import { TransferLog } from "../models/TransferLog.js";

/**
 * Sanitizes a filename before it is persisted as transfer metadata.
 * @param filename Untrusted browser filename.
 * @returns Safe display filename.
 */
function sanitizeFilename(filename: string): string {
  const safeName = filename
    .replace(/[\\/]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);
  return safeName || "unnamed-file";
}

/**
 * Persists transfer lifecycle metadata through the Sequelize model.
 */
export class TransferLogManager {
  /**
   * Marks unfinished persisted transfers as expired during API startup.
   * @returns Promise resolving after active records are closed.
   */
  public async expireActiveTransfers(): Promise<void> {
    await TransferLog.update(
      { state: "expired", updatedAt: new Date() },
      { where: { state: ["waiting", "transferring"] } },
    );
  }

  /**
   * Creates a lifecycle log entry for a transfer room.
   * @param room Transfer room.
   * @param state Lifecycle state.
   * @returns Promise resolving after persistence.
   */
  public async record(room: TransferRoom, state: TransferState): Promise<void> {
    const sender = [...room.peers.values()].find(
      (peer) => peer.role === "sender",
    );
    const receiver = [...room.peers.values()].find(
      (peer) => peer.role === "receiver",
    );
    const now = new Date();
    const values = {
      transferCode: room.code,
      senderId: sender?.id ?? null,
      receiverId: receiver?.id ?? null,
      filename:
        typeof room.metadata?.name === "string"
          ? sanitizeFilename(room.metadata.name)
          : null,
      fileSize:
        typeof room.metadata?.size === "number" ? room.metadata.size : null,
      state,
      updatedAt: now,
    };
    const existing = await TransferLog.findOne({
      where: { transferCode: room.code },
    });
    if (existing) await existing.update(values);
    else await TransferLog.create(values);
  }
}
