import type { FileInfo, TransferMessage, TransferRole } from '../types';
import { logger } from './logger';
import { config } from '../config';

/**
 * Registers the browser client ID with the API.
 * @param clientId Anonymous client identifier.
 * @returns Promise resolving after registration.
 */
export async function registerClient(clientId: string): Promise<void> {
  const response = await fetch(`${config.apiUrl}${config.apiPrefix}/clients`, {
    method: 'GET',
    headers: { 'x-client-id': clientId }
  });
  if (!response.ok) await readResponse<void>(response, 'ok');
}

/**
 * Creates a sender transfer and returns its code.
 * @param clientId Anonymous client identifier.
 * @returns The created transfer code.
 */
export async function createTransfer(clientId: string): Promise<string> {
  logger.debug('Creating transfer room');
  const response = await fetch(`${config.apiUrl}${config.apiPrefix}/transfers`, { method: 'POST', headers: { 'x-client-id': clientId } });
  return readResponse<string>(response, 'code');
}

/**
 * Validates and joins an existing transfer.
 * @param clientId Anonymous client identifier.
 * @param code User-entered transfer code.
 * @returns The normalized transfer code.
 */
export async function joinTransfer(clientId: string, code: string): Promise<string> {
  logger.debug('Joining transfer room', { code });
  const response = await fetch(`${config.apiUrl}${config.apiPrefix}/transfers/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-client-id': clientId },
    body: JSON.stringify({ code })
  });
  return readResponse<string>(response, 'code');
}

/**
 * Opens the single server-relayed WebSocket for a transfer.
 * @param code Transfer code.
 * @param clientId Anonymous client identifier.
 * @param role Device role.
 * @param onMessage Message callback.
 * @param onBinary Binary chunk callback.
 * @param onError Error callback.
 * @returns The open WebSocket.
 */
export function connectTransfer(code: string, clientId: string, role: TransferRole, onMessage: (message: TransferMessage, socket: WebSocket) => void, onBinary: (chunk: ArrayBuffer, socket: WebSocket) => void, onError: () => void): WebSocket {
  logger.info('Opening transfer socket', { code, role });
  const socket = new WebSocket(`${config.websocketUrl}${config.websocketPath}?code=${code}&client_id=${clientId}&role=${role}`);
  socket.binaryType = 'arraybuffer';
  socket.onmessage = (event) => {
    if (typeof event.data === 'string') onMessage(JSON.parse(event.data) as TransferMessage, socket);
    else onBinary(event.data as ArrayBuffer, socket);
  };
  socket.onerror = () => {
    logger.error('Transfer socket error', { code, role });
    onError();
  };
  socket.onclose = () => {
    logger.warn('Transfer socket closed', { code, role });
    onError();
  };
  return socket;
}

/**
 * Sends file metadata to the receiving device.
 * @param socket Connected transfer socket.
 * @param file File metadata.
 * @returns Nothing.
 */
export function sendMetadata(socket: WebSocket, file: FileInfo): void {
  socket.send(JSON.stringify({ type: 'metadata', metadata: file }));
}

/**
 * Reads a typed JSON API response and reports server errors.
 * @param response Fetch response.
 * @param key Expected response field.
 * @returns The requested response field.
 */
async function readResponse<T>(response: Response, key: string): Promise<T> {
  const data = await response.json() as { [key: string]: unknown; error?: string };
  if (!response.ok) throw new Error(data.error ?? 'The transfer request failed.');
  return data[key] as T;
}
