import { randomInt } from 'node:crypto';
import { WebSocket } from 'ws';
import type { TransferMessage } from '../models/transferMessage.js';
import type { TransferPeer, TransferRoom } from '../models/transferRoom.js';
import type { TransferState } from '../models/transferTypes.js';

/**
 * Manages active transfer rooms and protocol state.
 */
export class TransferManager {
  private readonly rooms = new Map<string, TransferRoom>();
  private readonly codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  private readonly codeTtl = 60 * 60 * 1000;

  /**
   * Creates a unique transfer room.
   * @returns The newly created room.
   */
  public createRoom(): TransferRoom {
    let code = this.createCode();
    while (this.rooms.has(code)) code = this.createCode();
    const now = Date.now();
    const room: TransferRoom = { code, createdAt: now, lastActivity: now, state: 'waiting', peers: new Map() };
    this.rooms.set(code, room);
    return room;
  }

  /**
   * Finds a valid room for a code.
   * @param code Transfer code.
   * @returns The room or undefined.
   */
  public getRoom(code: string): TransferRoom | undefined { return this.rooms.get(code); }

  /**
   * Checks whether a client owns an active room.
   * @param clientId Anonymous client identifier.
   * @returns Whether the client is already connected.
   */
  public hasClient(clientId: string): boolean {
    return [...this.rooms.values()].some((room) => [...room.peers.values()].some((peer) => peer.id === clientId));
  }

  /**
   * Adds a peer to a room and refreshes its activity timestamp.
   * @param room Transfer room.
   * @param peer Connected peer.
   * @returns Nothing.
   */
  public addPeer(room: TransferRoom, peer: TransferPeer): void { room.peers.set(peer.id, peer); room.lastActivity = Date.now(); }

  /**
   * Applies a protocol message and records its state.
   * @param room Transfer room.
   * @param message Parsed message.
   * @returns Nothing.
   */
  public applyMessage(room: TransferRoom, message: TransferMessage): TransferState | undefined {
    room.lastActivity = Date.now();
    if (message.type === 'metadata') { room.metadata = message.metadata; room.state = 'waiting'; return 'waiting'; }
    if (message.type === 'accepted') { room.state = 'transferring'; return 'transferring'; }
    if (message.type === 'denied') {
      room.metadata = undefined;
      room.state = 'waiting';
      return 'waiting';
    }
    if (message.type === 'state' && message.state) room.state = message.state;
    if (message.type === 'completed') { room.state = 'completed'; return 'completed'; }
    return undefined;
  }

  /**
   * Removes expired rooms and closes their sockets.
   * @returns Nothing.
   */
  public expireRooms(onExpired: (room: TransferRoom) => Promise<void>): void {
    for (const [code, room] of this.rooms) {
      if (Date.now() - room.lastActivity <= this.codeTtl) continue;
      void onExpired(room);
      for (const peer of room.peers.values()) { peer.socket.send(JSON.stringify({ type: 'error', message: 'This transfer code has expired.' })); peer.socket.close(4008, 'Transfer expired'); }
      this.rooms.delete(code);
    }
  }

  /**
   * Relays a message or binary chunk to every other peer.
   * @param room Transfer room.
   * @param senderId Sending peer identifier.
   * @param payload Message payload.
   * @returns Nothing.
   */
  public relay(room: TransferRoom, senderId: string, payload: string | Buffer): void {
    for (const peer of room.peers.values()) if (peer.id !== senderId && peer.socket.readyState === WebSocket.OPEN) peer.socket.send(payload);
  }

  /**
   * Removes a peer and deletes an empty room.
   * @param room Transfer room.
   * @param clientId Peer identifier.
   * @returns Nothing.
   */
  public removePeer(room: TransferRoom, clientId: string): void { room.peers.delete(clientId); if (room.peers.size === 0) this.rooms.delete(room.code); }

  /**
   * Expires a room immediately and notifies the remaining peer.
   * @param room Transfer room.
   * @param message Explanation for the remaining peer.
   * @returns Nothing.
   */
  public expireRoom(room: TransferRoom, message: string): void {
    for (const peer of room.peers.values()) {
      if (peer.socket.readyState === WebSocket.OPEN) {
        peer.socket.send(JSON.stringify({ type: 'expired', message }));
        peer.socket.close(4008, 'Transfer expired');
      }
    }
    this.rooms.delete(room.code);
  }

  /**
   * Creates a cryptographically random readable code.
   * @returns Ten-character transfer code.
   */
  private createCode(): string { return Array.from({ length: 10 }, () => this.codeAlphabet[randomInt(this.codeAlphabet.length)]).join(''); }
}
