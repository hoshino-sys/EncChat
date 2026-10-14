export interface EncryptedPayload {
  iv: string; // Base64 encoded 12-byte IV
  ciphertext: string; // Base64 encoded ciphertext
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  encrypted: EncryptedPayload;
  decryptedText?: string; // Decrypted plaintext cached in memory on client
  decryptionError?: boolean;
  isSelf?: boolean;
}

export interface RoomSession {
  roomId: string;
  roomKey: string; // Plaintext passphrase used to derive AES key
  userId: string;
  userName: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PeerUser {
  id: string;
  name: string;
  joinedAt: number;
}
