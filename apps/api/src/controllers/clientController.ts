import type { Request, Response } from "express";
import type { ClientManager } from "../managers/clientManager.js";

/**
 * Creates a controller for client lookup and connection tracking.
 * @param manager Client manager.
 * @returns Express route handler.
 */
export function createClientController(manager: ClientManager) {
  /**
   * Ensures the client ID supplied in the request header exists.
   * @param request Express request.
   * @param response Express response.
   * @returns HTTP response.
   */
  return async function register(
    request: Request,
    response: Response,
  ): Promise<void> {
    const clientId = request.header("x-client-id");
    if (!clientId) {
      response.status(400).json({ error: "A client_id is required." });
      return;
    }
    await manager.connect(clientId);
    response.json({ client_id: clientId, exists: true });
  };
}
