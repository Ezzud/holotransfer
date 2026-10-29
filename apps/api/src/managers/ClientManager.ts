import { Client } from "../models/Client.js";

/**
 * Manages database-backed anonymous client identities.
 */
export class ClientManager {
  private readonly pendingConnections = new Map<string, Promise<Client>>();

  /**
   * Registers a new client or updates its last connection time.
   * @param clientId Anonymous client identifier.
   * @returns Promise resolving to the persisted client.
   */
  public async connect(clientId: string): Promise<Client> {
    const pending = this.pendingConnections.get(clientId);
    if (pending) return pending;

    const connection = this.persistConnection(clientId);
    this.pendingConnections.set(clientId, connection);
    try {
      return await connection;
    } finally {
      this.pendingConnections.delete(clientId);
    }
  }

  /**
   * Persists one client connection.
   * @param clientId Anonymous client identifier.
   * @returns Promise resolving to the persisted client.
   */
  private async persistConnection(clientId: string): Promise<Client> {
    const now = new Date();
    const [client] = await Client.findOrCreate({
      where: { clientId },
      defaults: { clientId, createdAt: now, lastConnectedAt: now },
    });
    if (client.lastConnectedAt.getTime() !== now.getTime()) {
      await client.update({ lastConnectedAt: now });
    }
    return client;
  }

  /**
   * Checks whether a client identity exists.
   * @param clientId Anonymous client identifier.
   * @returns Promise resolving to true when the client exists.
   */
  public async exists(clientId: string): Promise<boolean> {
    return Boolean(await Client.findByPk(clientId));
  }

  /**
   * Validates an existing client and updates its connection timestamp.
   * @param clientId Anonymous client identifier.
   * @returns Promise resolving to true when the client is valid.
   */
  public async validateConnection(clientId: string): Promise<boolean> {
    const client = await Client.findByPk(clientId);
    if (!client) return false;
    await client.update({ lastConnectedAt: new Date() });
    return true;
  }
}
