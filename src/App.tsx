import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, RoomSession, ConnectionState, PeerUser } from './types/chat';
import { deriveKey, encryptMessage, decryptMessage } from './services/crypto';
import { ChatNetworkService } from './services/websocket';
import { useAltKey } from './hooks/useAltKey';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { StealthInput } from './components/StealthInput';
import { JoinRoomModal } from './components/JoinRoomModal';
import { EditNameModal } from './components/EditNameModal';
import { Eye, ShieldAlert } from 'lucide-react';

const STORAGE_KEY = 'encchat_persistent_session_v1';

export const App: React.FC = () => {
  const [session, setSession] = useState<RoomSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [peers, setPeers] = useState<PeerUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [systemNotices, setSystemNotices] = useState<string[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);

  const isAltPressed = useAltKey();
  const networkRef = useRef<ChatNetworkService | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);

  // Keep cryptoKeyRef in sync
  useEffect(() => {
    cryptoKeyRef.current = cryptoKey;
  }, [cryptoKey]);

  // Handle incoming encrypted message from peer
  const handleIncomingMessage = useCallback(async (msg: ChatMessage) => {
    // Check for duplicates
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;

      // If it's our own echoed message, keep existing
      if (msg.isSelf) {
        return [...prev, msg];
      }

      // Decrypt incoming message
      const key = cryptoKeyRef.current;
      if (key) {
        decryptMessage(msg.encrypted, key)
          .then((plaintext) => {
            setMessages((current) =>
              current.map((m) => (m.id === msg.id ? { ...m, decryptedText: plaintext } : m))
            );
          })
          .catch((err) => {
            console.warn('Decryption failed for message:', msg.id, err);
            setMessages((current) =>
              current.map((m) => (m.id === msg.id ? { ...m, decryptionError: true } : m))
            );
          });
      }

      return [...prev, msg];
    });
  }, []);

  const handlePeersUpdate = useCallback((newPeers: PeerUser[]) => {
    setPeers(newPeers);
  }, []);

  const handleStatusChange = useCallback((status: ConnectionState) => {
    setConnectionState(status);
  }, []);

  const handleSystemNotice = useCallback((notice: string) => {
    setSystemNotices((prev) => [...prev.slice(-10), notice]);
  }, []);

  // Initialize crypto key and network connection when session changes
  useEffect(() => {
    if (!session) {
      if (networkRef.current) {
        networkRef.current.disconnect();
        networkRef.current = null;
      }
      setCryptoKey(null);
      setMessages([]);
      setPeers([]);
      setSystemNotices([]);
      return;
    }

    let isMounted = true;

    async function initRoom() {
      if (!session) return;
      try {
        // Derive 256-bit AES-GCM key
        const key = await deriveKey(session.roomKey, session.roomId);
        if (!isMounted) return;
        setCryptoKey(key);

        // Connect network relay
        const network = new ChatNetworkService({
          onMessage: handleIncomingMessage,
          onPeersUpdate: handlePeersUpdate,
          onStatusChange: handleStatusChange,
          onSystemNotice: handleSystemNotice,
        });

        networkRef.current = network;
        network.connect(session.roomId, session.userId, session.userName);
      } catch (err) {
        console.error('Failed to initialize encrypted room:', err);
      }
    }

    initRoom();

    return () => {
      isMounted = false;
      if (networkRef.current) {
        networkRef.current.disconnect();
        networkRef.current = null;
      }
    };
  }, [session, handleIncomingMessage, handlePeersUpdate, handleStatusChange, handleSystemNotice]);

  // Join or create room
  const handleJoinRoom = (newSession: RoomSession) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    } catch (e) {
      console.warn('localStorage write failed', e);
    }
    setSession(newSession);
  };

  // Leave room (explicit close)
  const handleLeaveRoom = () => {
    if (window.confirm('确定要主动关闭/退出当前加密房间吗？\n退出后将清除本设备的房间密钥凭据。')) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn('localStorage remove failed', e);
      }
      if (networkRef.current) {
        networkRef.current.disconnect();
        networkRef.current = null;
      }
      setSession(null);
    }
  };

  // Update nickname
  const handleUpdateName = (newName: string) => {
    if (!session) return;
    const updated = { ...session, userName: newName };
    setSession(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('localStorage write failed', e);
    }
    if (networkRef.current) {
      networkRef.current.updateUserName(newName);
    }
  };

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!session || !cryptoKey || !networkRef.current) return;

    try {
      const encrypted = await encryptMessage(text, cryptoKey);
      const msg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        roomId: session.roomId,
        senderId: session.userId,
        senderName: session.userName,
        timestamp: Date.now(),
        encrypted,
        decryptedText: text, // Sender already knows the plaintext
        isSelf: true,
      };

      // Add to local state immediately
      setMessages((prev) => [...prev, msg]);

      // Broadcast to peers via network
      networkRef.current.sendMessage(msg);
    } catch (err) {
      console.error('Failed to encrypt or send message:', err);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#090a0f] text-slate-100 overflow-hidden font-sans select-none">
      {/* If no active session, show Join/Create Modal */}
      {!session && (
        <JoinRoomModal onJoin={handleJoinRoom} defaultSession={session} />
      )}

      {/* Active Room View */}
      {session && (
        <>
          {/* Header */}
          <ChatHeader
            roomId={session.roomId}
            userName={session.userName}
            peerCount={peers.length > 0 ? peers.length : 1}
            connectionState={connectionState}
            onEditName={() => setIsEditingName(true)}
            onLeaveRoom={handleLeaveRoom}
          />

          {/* Alt key active indicator banner for desktop */}
          {isAltPressed && (
            <div className="shrink-0 bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1 text-center text-xs font-mono text-emerald-400 flex items-center justify-center gap-2 animate-fade-in">
              <Eye className="w-3.5 h-3.5" />
              <span>Alt 键已激活：鼠标悬停消息即可透视解密明文</span>
            </div>
          )}

          {/* Main Chat Messages Stream */}
          <main className="flex-1 overflow-hidden flex flex-col relative max-w-4xl w-full mx-auto">
            <MessageList
              messages={messages}
              systemNotices={systemNotices}
              isAltPressed={isAltPressed}
            />

            {/* Bottom Anti-peeping Input Area */}
            <div className="shrink-0 p-3 md:p-4 bg-[#090a0f]/90 backdrop-blur-lg border-t border-[#1b2030] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <StealthInput onSendMessage={handleSendMessage} disabled={!cryptoKey} />
              
              {/* Mobile anti-peeping quick tip */}
              <div className="flex md:hidden items-center justify-center gap-1.5 mt-2 text-[10px] text-slate-400 font-mono">
                <ShieldAlert className="w-3 h-3 text-slate-400" />
                <span>手机端：长按任意气泡可临时查看解密明文</span>
              </div>
            </div>
          </main>

          {/* Edit Name Modal */}
          {isEditingName && (
            <EditNameModal
              currentName={session.userName}
              onSave={handleUpdateName}
              onClose={() => setIsEditingName(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
