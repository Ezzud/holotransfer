import type { Request, Response } from 'express';
import type { TransferManager } from '../managers/transferManager.js';
import type { ClientManager } from '../managers/clientManager.js';

/**
 * Creates an endpoint controller for sender room creation.
 * @param manager Transfer manager.
 * @returns Express route handler.
 */
export function createTransferController(manager: TransferManager, clients: ClientManager) {
  /**
   * Creates a sender room after validating its client identifier.
   * @param request Express request.
   * @param response Express response.
   * @returns HTTP response.
   */
  return async function create(request: Request, response: Response): Promise<void> {
    const clientId = request.header('x-client-id');
    if (!clientId) { response.status(400).json({ error: 'A client_id is required.' }); return; }
    if (!await clients.validateConnection(clientId)) { response.status(401).json({ error: 'Unknown client_id. Register the client first.' }); return; }
    if (manager.hasClient(clientId)) { response.status(409).json({ error: 'This client already has an active transfer.' }); return; }
    response.status(201).json({ code: manager.createRoom().code });
  };
}
