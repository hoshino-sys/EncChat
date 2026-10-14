import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, RoomSession, ConnectionState, PeerUser } from './types/chat';
import { deriveKey, encryptMessage, decryptMessage } from './services/crypto';
import { ChatNetworkService } from './services/websocket';
import { useAltKey } from './hooks/useAltKey';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { StealthInput } from './components/StealthInput';
import { LoginModal } from './components/LoginModal';
import { MemberListCard } from './components/MemberListCard';
import { AfkUnlockModal } from './components/AfkUnlockModal';
import { getCharCount } from './utils/maskCipher';

const STORAGE_KEY = 'encchat_user_session_v2';

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
  const [isAfkLocked, setIsAfkLocked] = useState(false);
  const [showAfkUnlockModal, setShowAfkUnlockModal] = useState(false);

  const isAltPressed = useAltKey();
  const networkRef = useRef<ChatNetworkService | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    cryptoKeyRef.current = cryptoKey;
  }, [cryptoKey]);

  // Handle incoming encrypted message
  const handleIncomingMessage = useCallback(async (msg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;

      if (msg.isSelf) {
        return [...prev, msg];
      }

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
        const key = await deriveKey(session.roomKey, session.roomId);
        if (!isMounted) return;
        setCryptoKey(key);

        const network = new ChatNetworkService({
          onMessage: handleIncomingMessage,
          onPeersUpdate: handlePeersUpdate,
          onStatusChange: handleStatusChange,
          onSystemNotice: handleSystemNotice,
        });

        networkRef.current = network;
        network.connect(session.roomId, session.userId, session.userName, session.authHash);
      } catch (err) {
        console.error('Failed to initialize chamber:', err);
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

  const handleLogin = (newSession: RoomSession) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    } catch (e) {
      console.warn('localStorage write failed', e);
    }
    setSession(newSession);
  };

  const handleLeaveRoom = () => {
    if (window.confirm('确认离席退室？')) {
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
      setIsAfkLocked(false);
    }
  };

  const handleToggleAfk = () => {
    if (isAfkLocked) {
      setShowAfkUnlockModal(true);
    } else {
      setIsAfkLocked(true);
    }
  };

  const handleUnlockAfk = () => {
    setIsAfkLocked(false);
    setShowAfkUnlockModal(false);
  };

  const handleSendMessage = async (text: string) => {
    if (!session || !cryptoKey || !networkRef.current) return;

    try {
      const encrypted = await encryptMessage(text, cryptoKey);
      const charCount = getCharCount(text);
      const msg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        roomId: session.roomId,
        senderId: session.userId,
        senderName: session.userName,
        timestamp: Date.now(),
        charCount,
        encrypted,
        decryptedText: text,
        isSelf: true,
      };

      setMessages((prev) => [...prev, msg]);
      networkRef.current.sendMessage(msg);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full ink-bg text-[#ece8df] overflow-hidden select-none font-serif">
      {/* Login Modal */}
      {!session && <LoginModal onLogin={handleLogin} savedSession={session} />}

      {/* Active Chamber Layout */}
      {session && (
        <div className="flex w-full h-full overflow-hidden">
          {/* Desktop Left Sidebar: White Frosted Glass Card */}
          <aside className="hidden lg:flex flex-col w-72 shrink-0 p-4 pr-1 h-full">
            <MemberListCard
              currentUser={session.userName}
              peers={peers}
              connectionState={connectionState}
              isAfkLocked={isAfkLocked}
              onToggleAfk={handleToggleAfk}
            />
          </aside>

          {/* Main Chat Flow */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <ChatHeader
              roomId={session.roomId}
              userName={session.userName}
              userRole={session.role}
              peerCount={peers.length > 0 ? peers.length : 1}
              connectionState={connectionState}
              isAfkLocked={isAfkLocked}
              onToggleAfk={handleToggleAfk}
              onReconnect={() => networkRef.current?.reconnect()}
              onLeaveRoom={handleLeaveRoom}
            />

            {/* Messages Stream */}
            <main className="flex-1 overflow-hidden flex flex-col relative max-w-3xl w-full mx-auto">
              <MessageList
                messages={messages}
                systemNotices={systemNotices}
                isAltPressed={isAltPressed}
                isAfkLocked={isAfkLocked}
              />

              {/* Input Capsule Area */}
              <div className="shrink-0 px-4 md:px-6 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                <StealthInput onSendMessage={handleSendMessage} disabled={!cryptoKey} />
              </div>
            </main>
          </div>
        </div>
      )}

      {/* AFK Unlock Modal */}
      {showAfkUnlockModal && (
        <AfkUnlockModal
          onUnlock={handleUnlockAfk}
          onClose={() => setShowAfkUnlockModal(false)}
        />
      )}
    </div>
  );
};

export default App;
