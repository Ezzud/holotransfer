const ivLength = 12;

/**
 * Generates an exportable ECDH key pair for a transfer.
 * @returns The generated key pair.
 */
export function generateTransferKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"],
  ) as Promise<CryptoKeyPair>;
}

/**
 * Exports an ECDH public key as base64.
 * @param key Public key to export.
 * @returns Base64 encoded public key.
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  return toBase64(await crypto.subtle.exportKey("spki", key));
}

/**
 * Imports a base64 encoded ECDH public key.
 * @param encoded Base64 encoded public key.
 * @returns Imported public key.
 */
export function importPublicKey(encoded: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    fromBase64(encoded),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

/**
 * Derives a shared AES-GCM key from an ECDH key pair.
 * @param localKeyPair Local ECDH key pair.
 * @param remotePublicKey Remote ECDH public key.
 * @returns Derived shared encryption key.
 */
export function deriveTransferKey(
  localKeyPair: CryptoKeyPair,
  remotePublicKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: remotePublicKey },
    localKeyPair.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypts one file chunk with a fresh initialization vector.
 * @param key Shared AES-GCM key.
 * @param chunk Plaintext file chunk.
 * @returns IV-prefixed ciphertext packet.
 */
export async function encryptChunk(
  key: CryptoKey,
  chunk: ArrayBuffer,
): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(ivLength));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    chunk,
  );
  const packet = new Uint8Array(ivLength + ciphertext.byteLength);
  packet.set(iv);
  packet.set(new Uint8Array(ciphertext), ivLength);
  return packet.buffer;
}

/**
 * Decrypts an IV-prefixed AES-GCM file chunk.
 * @param key Shared AES-GCM key.
 * @param packet Encrypted chunk packet.
 * @returns Plaintext file chunk.
 */
export function decryptChunk(
  key: CryptoKey,
  packet: ArrayBuffer,
): Promise<ArrayBuffer> {
  if (packet.byteLength <= ivLength)
    return Promise.reject(new Error("Invalid encrypted chunk."));
  const bytes = new Uint8Array(packet);
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytes.subarray(0, ivLength) },
    key,
    bytes.subarray(ivLength),
  );
}

/**
 * Converts binary data to base64.
 * @param data Binary data.
 * @returns Base64 representation.
 */
function toBase64(data: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(data)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Converts base64 to binary data.
 * @param value Base64 representation.
 * @returns Binary data.
 */
function fromBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const data = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    data[index] = binary.charCodeAt(index);
  return data.buffer;
}
