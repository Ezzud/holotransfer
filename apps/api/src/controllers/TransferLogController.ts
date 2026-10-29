import type { TransferLogManager } from "../managers/TransferLogManager.js";
import type { TransferRoom, TransferState } from "../Types.js";

/**
 * Creates the controller used by transfer lifecycle handlers.
 * @param manager Transfer log model manager.
 * @returns Transfer log controller.
 */
export function createTransferLogController(manager: TransferLogManager) {
  /**
   * Records a transfer lifecycle event without exposing file contents.
   * @param room Transfer room.
   * @param state Lifecycle state.
   * @returns Promise resolving after the event is queued.
   */
  return async function record(
    room: TransferRoom,
    state: TransferState,
  ): Promise<void> {
    await manager.record(room, state);
  };
}
