import { EncryptedPayload } from '../types/chat';

// Helper: Uint8Array to Base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a 256-bit AES-GCM key from a user passphrase and roomId using PBKDF2.
 */
export async function deriveKey(passphrase: string, roomId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Use roomId as deterministic salt
  const salt = enc.encode(`EncChat-Salt-v1:${roomId.trim().toLowerCase()}`);

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext message string with AES-GCM.
 */
export async function encryptMessage(text: string, key: CryptoKey): Promise<EncryptedPayload> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for GCM
  const encodedText = enc.encode(text);

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedText
  );

  return {
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(cipherBuffer)),
  };
}

/**
 * Decrypts an encrypted payload with AES-GCM. Throws if wrong key or tampered.
 */
export async function decryptMessage(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const iv = base64ToUint8Array(payload.iv);
  const ciphertext = base64ToUint8Array(payload.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    ciphertext as unknown as BufferSource
  );

  return new TextDecoder().decode(decryptedBuffer);
}
