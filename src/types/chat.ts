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
  charCount?: number; // Exact character count for 1:1 masked rune rendering
  encrypted: EncryptedPayload;
  decryptedText?: string; // Decrypted plaintext cached in memory on client
  decryptionError?: boolean;
  isSelf?: boolean;
  isRead?: boolean;
  readAt?: number;
  readBy?: string;
}

export type UserRole = 'admin' | 'user';

export interface RoomSession {
  roomId: string;
  roomKey: string; // Plaintext passphrase used to derive AES key
  userId: string;
  userName: '夜星' | '小夜星';
  role: UserRole;
  authHash: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PeerUser {
  id: string;
  name: string;
  role?: UserRole;
  joinedAt: number;
}
