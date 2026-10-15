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
import { notificationService } from './services/notification';

const STORAGE_KEY = 'encchat_user_session_v2';
const AFK_LOCK_KEY = 'encchat_afk_locked_v2';
const MESSAGE_CACHE_PREFIX = 'encchat_cached_messages_v1_';

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

  // Load cached messages immediately on startup to eliminate re-fetching blank screen
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const sess = JSON.parse(saved);
        if (sess?.roomId) {
          const cached = localStorage.getItem(MESSAGE_CACHE_PREFIX + sess.roomId);
          if (cached) {
            return JSON.parse(cached);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load message cache:', e);
    }
    return [];
  });

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

  // Combination peek hook: Ctrl + Space
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

  // Request notification permissions on mount
  useEffect(() => {
    notificationService.init();
  }, []);

  // Save messages to local cache whenever messages change (keeps up to 200 messages with decryptedText)
  useEffect(() => {
    if (session?.roomId && messages.length > 0) {
      try {
        const toCache = messages.slice(-200);
        localStorage.setItem(MESSAGE_CACHE_PREFIX + session.roomId, JSON.stringify(toCache));
      } catch (e) {
        console.warn('Failed to save message cache:', e);
      }
    }
  }, [session?.roomId, messages]);

  // Handle incoming encrypted message with persistent isSelf identity check
  const handleIncomingMessage = useCallback(async (msg: ChatMessage) => {
    const currentSession = sessionRef.current;
    const isSelf = Boolean(
      msg.isSelf ||
      (currentSession && (msg.senderName === currentSession.userName || msg.senderId === currentSession.userId))
    );

    // Trigger background notification if user is not in app
    notificationService.notifyNewMessage(msg.senderName, isSelf);

    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;

      const normalizedMsg: ChatMessage = {
        ...msg,
        isSelf,
        isRead: Boolean(msg.isRead),
      };

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

  // Handle history replay with smart cache merge to eliminate re-decryption blank screen
  const handleIncomingHistory = useCallback(async (historyList: ChatMessage[]) => {
    const key = cryptoKeyRef.current;
    const currentSession = sessionRef.current;

    setMessages((prev) => {
      const prevMap = new Map<string, ChatMessage>(prev.map((m) => [m.id, m]));
      const toDecrypt: ChatMessage[] = [];

      for (const serverMsg of historyList) {
        const existing = prevMap.get(serverMsg.id);
        const isSelf = Boolean(
          serverMsg.isSelf ||
          (currentSession && (serverMsg.senderName === currentSession.userName || serverMsg.senderId === currentSession.userId))
        );
        const isRead = Boolean(serverMsg.isRead);
        const readAt = serverMsg.readAt;

        if (existing) {
          // Already in local cache! Keep cached decryptedText to avoid lag
          const updated: ChatMessage = {
            ...existing,
            isSelf,
            isRead: isRead || existing.isRead,
            readAt: readAt || existing.readAt,
            decryptedText: existing.decryptedText || serverMsg.decryptedText,
          };
          prevMap.set(serverMsg.id, updated);
          if (!updated.decryptedText && key && updated.encrypted && !updated.isSelf) {
            toDecrypt.push(updated);
          }
        } else {
          // Newly arrived message from server history
          const newMsg: ChatMessage = {
            ...serverMsg,
            isSelf,
            isRead,
            readAt,
          };
          prevMap.set(serverMsg.id, newMsg);
          if (newMsg.decryptedText) {
            // Already has plaintext
          } else if (key && newMsg.encrypted && !newMsg.isSelf) {
            toDecrypt.push(newMsg);
          }
        }
      }

      if (toDecrypt.length > 0 && key) {
        Promise.all(
          toDecrypt.map(async (msg) => {
            try {
              const text = await decryptMessage(msg.encrypted, key);
              return { id: msg.id, text };
            } catch {
              return { id: msg.id, error: true };
            }
          })
        ).then((results) => {
          setMessages((cur) =>
            cur.map((m) => {
              const found = results.find((r) => r.id === m.id);
              if (found) {
                return found.text ? { ...m, decryptedText: found.text } : { ...m, decryptionError: true };
              }
              return m;
            })
          );
        });
      }

      return Array.from(prevMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    });
  }, []);

  // Handle read receipts received from other peers or server
  const handleMessagesRead = useCallback((messageIds: string[], _readerName: string, readAt: number) => {
    const idSet = new Set(messageIds);
    setMessages((prev) =>
      prev.map((m) => (idSet.has(m.id) ? { ...m, isRead: true, readAt: m.readAt || readAt } : m))
    );
  }, []);

  // Proactive self-healing: automatically decrypt any messages that arrived before cryptoKey was ready
  useEffect(() => {
    if (!cryptoKey || messages.length === 0) return;
    const pendingDecrypt = messages.filter((m) => !m.isSelf && !m.decryptedText && m.encrypted);
    if (pendingDecrypt.length === 0) return;

    Promise.all(
      pendingDecrypt.map(async (m) => {
        try {
          const text = await decryptMessage(m.encrypted, cryptoKey);
          return { id: m.id, text };
        } catch {
          return { id: m.id, error: true };
        }
      })
    ).then((results) => {
      setMessages((cur) =>
        cur.map((m) => {
          const found = results.find((r) => r.id === m.id);
          if (found) {
            return found.text ? { ...m, decryptedText: found.text } : { ...m, decryptionError: true };
          }
          return m;
        })
      );
    });
  }, [cryptoKey, messages]);

  // Trigger mark-as-read when local user deciphers/unmasks a message
  const handleMarkRead = useCallback((messageId: string) => {
    if (!networkRef.current) return;
    networkRef.current.markMessagesRead([messageId]);
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isRead: true, readAt: Date.now() } : m))
    );
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
        cryptoKeyRef.current = key;
        setCryptoKey(key);

        const network = new ChatNetworkService({
          onMessage: handleIncomingMessage,
          onHistory: handleIncomingHistory,
          onPeersUpdate: handlePeersUpdate,
          onStatusChange: handleStatusChange,
          onSystemNotice: handleSystemNotice,
          onMessagesRead: handleMessagesRead,
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
  }, [session, handleIncomingMessage, handleIncomingHistory, handleMessagesRead, handlePeersUpdate, handleStatusChange, handleSystemNotice]);

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
        console.warn('localStorage lock failed', e);
      }
    }
  };

  const handleUnlockAfk = () => {
    setIsAfkLocked(false);
    setShowAfkUnlockModal(false);
    try {
      localStorage.removeItem(AFK_LOCK_KEY);
    } catch (e) {
      console.warn('localStorage unlock failed', e);
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

    // Automatically mark previous incoming unread messages as read upon sending a reply
    const unreadIncoming = messages.filter((m) => !m.isSelf && !m.isRead).map((m) => m.id);
    if (unreadIncoming.length > 0 && networkRef.current) {
      networkRef.current.markMessagesRead(unreadIncoming);
      setMessages((prev) =>
        prev.map((m) => (unreadIncoming.includes(m.id) ? { ...m, isRead: true, readAt: Date.now() } : m))
      );
    }

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
        isRead: false,
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
                  onMarkRead={handleMarkRead}
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
