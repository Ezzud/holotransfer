import type { Request, Response } from 'express';
import type { TransferManager } from '../managers/transferManager.js';
import type { ClientManager } from '../managers/clientManager.js';

/**
 * Creates an endpoint controller for receiver room joining.
 * @param manager Transfer manager.
 * @returns Express route handler.
 */
export function joinTransferController(manager: TransferManager, clients: ClientManager) {
  /**
   * Validates a receiver code without exposing transfer data.
   * @param request Express request.
   * @param response Express response.
   * @returns HTTP response.
   */
  return async function join(request: Request, response: Response): Promise<void> {
    const clientId = request.header('x-client-id');
    if (!clientId) { response.status(400).json({ error: 'A client_id is required.' }); return; }
    if (!await clients.validateConnection(clientId)) { response.status(401).json({ error: 'Unknown client_id. Register the client first.' }); return; }
    const code = String(request.body?.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const room = manager.getRoom(code);
    if (!room || room.state !== 'waiting') { response.status(404).json({ error: 'That code is unavailable.' }); return; }
    if (room.peers.size >= 2) { response.status(409).json({ error: 'That transfer already has two devices.' }); return; }
    response.json({ code });
  };
}
