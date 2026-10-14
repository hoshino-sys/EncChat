import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, RoomSession, ConnectionState, PeerUser } from './types/chat';
import { deriveKey, encryptMessage, decryptMessage } from './services/crypto';
import { ChatNetworkService } from './services/websocket';
import { usePeekCombo } from './hooks/useAltKey';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { StealthInput } from './components/StealthInput';
import { LoginModal } from './components/LoginModal';
import { MemberListCard } from './components/MemberListCard';
import { MobileMemberModal } from './components/MobileMemberModal';
import { AfkUnlockModal } from './components/AfkUnlockModal';
import { getCharCount } from './utils/maskCipher';

const STORAGE_KEY = 'encchat_user_session_v2';
const AFK_LOCK_KEY = 'encchat_afk_locked_v2';

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
  
  // Persistent AFK lock state: survives page reload (F5)
  const [isAfkLocked, setIsAfkLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AFK_LOCK_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [showAfkUnlockModal, setShowAfkUnlockModal] = useState(false);
  const [showMobileMembers, setShowMobileMembers] = useState(false);

  // Combination peek hook: Alt + Space
  const { isComboActive } = usePeekCombo();

  const networkRef = useRef<ChatNetworkService | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);
  const sessionRef = useRef<RoomSession | null>(null);

  useEffect(() => {
    cryptoKeyRef.current = cryptoKey;
  }, [cryptoKey]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Handle incoming encrypted message with persistent isSelf identity check
  const handleIncomingMessage = useCallback(async (msg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;

      const currentSession = sessionRef.current;
      const isSelf = Boolean(
        msg.isSelf ||
        (currentSession && (msg.senderName === currentSession.userName || msg.senderId === currentSession.userId))
      );
      const normalizedMsg = { ...msg, isSelf };

      if (normalizedMsg.isSelf) {
        return [...prev, normalizedMsg];
      }

      const key = cryptoKeyRef.current;
      if (key) {
        decryptMessage(normalizedMsg.encrypted, key)
          .then((plaintext) => {
            setMessages((current) =>
              current.map((m) => (m.id === normalizedMsg.id ? { ...m, decryptedText: plaintext } : m))
            );
          })
          .catch((err) => {
            console.warn('Decryption failed for message:', normalizedMsg.id, err);
            setMessages((current) =>
              current.map((m) => (m.id === normalizedMsg.id ? { ...m, decryptionError: true } : m))
            );
          });
      }

      return [...prev, normalizedMsg];
    });
  }, []);

  // Handle history replay with persistent isSelf identity check
  const handleIncomingHistory = useCallback(async (historyList: ChatMessage[]) => {
    const key = cryptoKeyRef.current;
    const currentSession = sessionRef.current;

    const decryptedList = await Promise.all(
      historyList.map(async (msg) => {
        const isSelf = Boolean(
          msg.isSelf ||
          (currentSession && (msg.senderName === currentSession.userName || msg.senderId === currentSession.userId))
        );

        if (msg.decryptedText) {
          return { ...msg, isSelf };
        }

        if (key && msg.encrypted) {
          try {
            const plaintext = await decryptMessage(msg.encrypted, key);
            return { ...msg, isSelf, decryptedText: plaintext };
          } catch {
            return { ...msg, isSelf, decryptionError: true };
          }
        }
        return { ...msg, isSelf };
      })
    );

    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const newItems = decryptedList.filter((m) => !existingIds.has(m.id));
      return [...prev, ...newItems].sort((a, b) => a.timestamp - b.timestamp);
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
          onHistory: handleIncomingHistory,
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
  }, [session, handleIncomingMessage, handleIncomingHistory, handlePeersUpdate, handleStatusChange, handleSystemNotice]);

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
        localStorage.removeItem(AFK_LOCK_KEY);
      } catch (e) {
        console.warn('localStorage remove failed', e);
      }
      if (networkRef.current) {
        networkRef.current.disconnect();
        networkRef.current = null;
      }
      setSession(null);
      setIsAfkLocked(false);
      setShowMobileMembers(false);
    }
  };

  const handleToggleAfk = () => {
    if (isAfkLocked) {
      setShowAfkUnlockModal(true);
    } else {
      setIsAfkLocked(true);
      try {
        localStorage.setItem(AFK_LOCK_KEY, 'true');
      } catch (e) {
        console.warn('localStorage write failed', e);
      }
    }
  };

  const handleUnlockAfk = () => {
    setIsAfkLocked(false);
    setShowAfkUnlockModal(false);
    try {
      localStorage.removeItem(AFK_LOCK_KEY);
    } catch (e) {
      console.warn('localStorage remove failed', e);
    }
  };

  // Keyboard shortcut lock listener: Esc OR (Alt+L / Ctrl+L)
  useEffect(() => {
    if (!session) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isLockKey =
        e.key === 'Escape' ||
        ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'l');

      if (isLockKey) {
        e.preventDefault();
        if (!isAfkLocked) {
          setIsAfkLocked(true);
          try {
            localStorage.setItem(AFK_LOCK_KEY, 'true');
          } catch {}
        } else {
          setShowAfkUnlockModal(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [session, isAfkLocked]);

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
    <div className="flex flex-col h-[100dvh] w-full ink-bg text-[#ece8df] overflow-hidden select-none font-serif">
      {/* Login Modal */}
      {!session && <LoginModal onLogin={handleLogin} savedSession={session} />}

      {/* Active Chamber Layout */}
      {session && (
        <div className="flex flex-col w-full h-full overflow-hidden">
          {/* Full-Width Unified Top Header */}
          <ChatHeader
            roomId={session.roomId}
            userName={session.userName}
            userRole={session.role}
            peerCount={peers.length > 0 ? peers.length : 1}
            connectionState={connectionState}
            isAfkLocked={isAfkLocked}
            onToggleAfk={handleToggleAfk}
            onOpenMembers={() => setShowMobileMembers(true)}
            onReconnect={() => networkRef.current?.reconnect()}
            onLeaveRoom={handleLeaveRoom}
          />

          {/* Body: Left Sidebar (Desktop) + Right Chat Stream */}
          <div className="flex-1 flex w-full overflow-hidden">
            {/* Desktop Left Sidebar: White Frosted Glass Card */}
            <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 p-3 lg:p-4 pr-1 h-full">
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
              <main className="flex-1 overflow-hidden flex flex-col relative max-w-3xl w-full mx-auto">
                <MessageList
                  messages={messages}
                  systemNotices={systemNotices}
                  isComboActive={isComboActive}
                  currentUserName={session.userName}
                  isAfkLocked={isAfkLocked}
                />

                {/* Input Capsule Area */}
                <div className="shrink-0 px-4 md:px-6 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                  <StealthInput onSendMessage={handleSendMessage} disabled={!cryptoKey} />
                </div>
              </main>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Member Roster Modal */}
      {session && showMobileMembers && (
        <MobileMemberModal
          currentUser={session.userName}
          peers={peers}
          connectionState={connectionState}
          isAfkLocked={isAfkLocked}
          onToggleAfk={handleToggleAfk}
          onClose={() => setShowMobileMembers(false)}
        />
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
