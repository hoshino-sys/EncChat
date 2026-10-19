import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, RoomSession, ConnectionState, PeerUser, DecryptedImagePayload } from './types/chat';
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
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { compressImage } from './utils/imageCompressor';
import { getCharCount } from './utils/maskCipher';
import { notificationService } from './services/notification';
import { SplashScreen } from './components/SplashScreen';
import { UpdateModal } from './components/UpdateModal';
import { NotificationModal } from './components/NotificationModal';
import { checkForUpdate, VersionInfo, CURRENT_VERSION_CODE } from './services/updateChecker';
import { isCapacitorNative } from './services/apiConfig';

const STORAGE_KEY = 'encchat_user_session_v2';
const AFK_LOCK_KEY = 'encchat_afk_locked_v2';
const MESSAGE_CACHE_PREFIX = 'encchat_cached_messages_v1_';

async function decryptMsgPayload(msg: ChatMessage, key: CryptoKey): Promise<Partial<ChatMessage>> {
  try {
    const raw = await decryptMessage(msg.encrypted, key);
    if (msg.msgType === 'image') {
      try {
        const parsed = JSON.parse(raw);
        return {
          decryptedImage: {
            width: parsed.width,
            height: parsed.height,
            data: parsed.data,
            size: parsed.size,
          },
        };
      } catch {
        return { decryptionError: true };
      }
    } else {
      return { decryptedText: raw };
    }
  } catch {
    return { decryptionError: true };
  }
}

let hasShownSplash = false;

// Monotonic authoritative comparator: strictly sort by seq if available, fallback to calibrated timestamp
export const sortMessages = (list: ChatMessage[]): ChatMessage[] => {
  return [...list].sort((a, b) => {
    if (a.seq !== undefined && b.seq !== undefined) {
      return a.seq - b.seq;
    }
    return a.timestamp - b.timestamp;
  });
};

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
            return sortMessages(JSON.parse(cached));
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
  const [previewImage, setPreviewImage] = useState<{
    image: DecryptedImagePayload;
    senderName: string;
    timestamp: number;
  } | null>(null);

  // Splash & In-App Update States
  const [showSplash, setShowSplash] = useState(() => !hasShownSplash);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Mobile virtual keyboard viewport adaptation
  const [viewportHeight, setViewportHeight] = useState<number | null>(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      return window.visualViewport.height;
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        if (window.scrollY !== 0) {
          window.scrollTo(0, 0);
        }
      }
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);
    handleViewportChange();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  const isKeyboardOpen =
    viewportHeight !== null &&
    typeof window !== 'undefined' &&
    viewportHeight < (window.innerHeight || window.screen.height) * 0.8;

  const handleFinishSplash = useCallback(() => {
    hasShownSplash = true;
    setShowSplash(false);
  }, []);

  // Combination peek hook: Ctrl + RightClick
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

  // Check for in-app updates
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdate().then((info) => {
        if (info) {
          setVersionInfo(info);
          setShowUpdateModal(true);
          notificationService.notifyUpdateAvailable(info.latestVersion, info.downloadUrl);
        }
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Save messages to local cache whenever messages change
  // For image messages, keep metadata but omit huge base64 strings so localStorage quota is never exceeded
  useEffect(() => {
    if (session?.roomId && messages.length > 0) {
      try {
        const toCache = messages.slice(-100).map((m) => {
          if (m.msgType === 'image') {
            return {
              ...m,
              decryptedImage: undefined,
            };
          }
          return m;
        });
        localStorage.setItem(MESSAGE_CACHE_PREFIX + session.roomId, JSON.stringify(toCache));
      } catch (e) {
        console.warn('Failed to save message cache:', e);
      }
    }
  }, [session?.roomId, messages]);

  // Handle incoming encrypted message with persistent isSelf identity check and monotonic sort
  const handleIncomingMessage = useCallback(async (msg: ChatMessage) => {
    const currentSession = sessionRef.current;
    const isSelf = Boolean(
      msg.isSelf ||
      (currentSession && (msg.senderName === currentSession.userName || msg.senderId === currentSession.userId))
    );

    // Trigger background notification if user is not in app
    notificationService.notifyNewMessage(msg.senderName, isSelf, msg.msgType === 'image');

    setMessages((prev) => {
      const existing = prev.find((m) => m.id === msg.id);
      if (existing) {
        return sortMessages(
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  seq: msg.seq ?? m.seq,
                  timestamp: msg.timestamp || m.timestamp,
                  serverTimestamp: msg.serverTimestamp || m.serverTimestamp,
                  isRead: Boolean(msg.isRead || m.isRead),
                }
              : m
          )
        );
      }

      const normalizedMsg: ChatMessage = {
        ...msg,
        isSelf,
        isRead: Boolean(msg.isRead),
      };

      if (normalizedMsg.isSelf) {
        return sortMessages([...prev, normalizedMsg]);
      }

      const key = cryptoKeyRef.current;
      if (key) {
        decryptMsgPayload(normalizedMsg, key).then((decryptedData) => {
          setMessages((current) =>
            current.map((m) => (m.id === normalizedMsg.id ? { ...m, ...decryptedData } : m))
          );
        });
      }

      return sortMessages([...prev, normalizedMsg]);
    });
  }, []);

  // Handle message ACK from server containing authoritative seq & timestamp
  const handleMessageAck = useCallback((id: string, seq: number, timestamp: number) => {
    setMessages((prev) =>
      sortMessages(
        prev.map((m) =>
          m.id === id ? { ...m, seq, timestamp, serverTimestamp: timestamp } : m
        )
      )
    );
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
          // Already in local cache! Keep cached decryptedText or decryptedImage to avoid lag
          const updated: ChatMessage = {
            ...existing,
            seq: serverMsg.seq ?? existing.seq,
            timestamp: serverMsg.timestamp || existing.timestamp,
            serverTimestamp: serverMsg.serverTimestamp || existing.serverTimestamp,
            isSelf,
            isRead: isRead || existing.isRead,
            readAt: readAt || existing.readAt,
            decryptedText: existing.decryptedText || serverMsg.decryptedText,
            decryptedImage: existing.decryptedImage || serverMsg.decryptedImage,
          };
          prevMap.set(serverMsg.id, updated);
          const needsDecrypt = !updated.decryptedText && !updated.decryptedImage && !updated.isSelf && updated.encrypted;
          if (needsDecrypt && key) {
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
          const needsDecrypt = !newMsg.decryptedText && !newMsg.decryptedImage && !newMsg.isSelf && newMsg.encrypted;
          if (needsDecrypt && key) {
            toDecrypt.push(newMsg);
          }
        }
      }

      if (toDecrypt.length > 0 && key) {
        Promise.all(
          toDecrypt.map(async (msg) => {
            const dec = await decryptMsgPayload(msg, key);
            return { id: msg.id, ...dec };
          })
        ).then((results) => {
          setMessages((cur) =>
            cur.map((m) => {
              const found = results.find((r) => r.id === m.id);
              if (found) {
                return { ...m, ...found };
              }
              return m;
            })
          );
        });
      }

      return sortMessages(Array.from(prevMap.values()));
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
    const pendingDecrypt = messages.filter(
      (m) => !m.isSelf && !m.decryptedText && !m.decryptedImage && m.encrypted && !m.decryptionError
    );
    if (pendingDecrypt.length === 0) return;

    Promise.all(
      pendingDecrypt.map(async (m) => {
        const dec = await decryptMsgPayload(m, cryptoKey);
        return { id: m.id, ...dec };
      })
    ).then((results) => {
      setMessages((cur) =>
        cur.map((m) => {
          const found = results.find((r) => r.id === m.id);
          if (found) {
            return { ...m, ...found };
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
          onMessageAck: handleMessageAck,
          onUpdateAvailable: async (info: any) => {
            if (info && info.latestVersion) {
              let currentCode = CURRENT_VERSION_CODE;
              if (isCapacitorNative()) {
                try {
                  const capacitor = (window as any).Capacitor;
                  if (capacitor?.Plugins?.AppUpdate) {
                    const appVer = await capacitor.Plugins.AppUpdate.getAppVersion();
                    if (appVer && typeof appVer.versionCode === 'number') {
                      currentCode = appVer.versionCode;
                    }
                  }
                } catch (e) {
                  console.warn('Failed to query native app version:', e);
                }
              }
              if (info.versionCode > currentCode) {
                setVersionInfo(info);
                setShowUpdateModal(true);
                notificationService.notifyUpdateAvailable(info.latestVersion, info.downloadUrl);
              }
            }
          },
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
  }, [session, handleIncomingMessage, handleIncomingHistory, handleMessagesRead, handleMessageAck, handlePeersUpdate, handleStatusChange, handleSystemNotice]);

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
      const now = networkRef.current?.getServerTime() || Date.now();
      const msg: ChatMessage = {
        id: `msg_${now}_${Math.random().toString(36).substring(2, 8)}`,
        roomId: session.roomId,
        senderId: session.userId,
        senderName: session.userName,
        timestamp: now,
        charCount,
        encrypted,
        decryptedText: text,
        isSelf: true,
        isRead: false,
      };

      setMessages((prev) => sortMessages([...prev, msg]));
      networkRef.current.sendMessage(msg);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleSendImage = async (file: File) => {
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
      const compressed = await compressImage(file);
      const imagePayloadJson = JSON.stringify({
        type: 'image',
        width: compressed.width,
        height: compressed.height,
        data: compressed.dataUrl,
        size: compressed.size,
      });

      const encrypted = await encryptMessage(imagePayloadJson, cryptoKey);
      const now = networkRef.current?.getServerTime() || Date.now();
      const msg: ChatMessage = {
        id: `img_${now}_${Math.random().toString(36).substring(2, 8)}`,
        roomId: session.roomId,
        senderId: session.userId,
        senderName: session.userName,
        timestamp: now,
        msgType: 'image',
        imageMeta: {
          width: compressed.width,
          height: compressed.height,
          aspectRatio: compressed.aspectRatio,
          size: compressed.size,
        },
        encrypted,
        decryptedImage: {
          width: compressed.width,
          height: compressed.height,
          data: compressed.dataUrl,
          size: compressed.size,
        },
        isSelf: true,
        isRead: false,
      };

      setMessages((prev) => sortMessages([...prev, msg]));
      networkRef.current.sendMessage(msg);
    } catch (err) {
      console.error('Failed to send image:', err);
    }
  };

  return (
    <div
      className="relative flex flex-col w-full bg-[#0A0B0D] text-[#E6E4DD] overflow-hidden select-none font-sans"
      style={{ height: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
    >
      {/* Subtle Xuan Paper Texture Overlay (Opacity ~0.03) */}
      <div className="fixed inset-0 pointer-events-none ink-paper-noise z-0" aria-hidden="true" />

      {/* Breathing Water-Ink Ambient Drifting Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute top-[-8%] left-[-5%] w-[420px] h-[420px] rounded-full bg-[#4E7A6B]/12 blur-[140px] animate-ink-drift-1" />
        <div className="absolute bottom-[-8%] right-[-5%] w-[480px] h-[480px] rounded-full bg-[#323844]/18 blur-[120px] animate-ink-drift-2" />
      </div>

      {/* Login Modal */}
      {!session && <LoginModal onLogin={handleLogin} savedSession={session} />}

      {/* Active Chamber Layout */}
      {session && (
        <div className="relative z-10 flex flex-col w-full h-full overflow-hidden">
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
            onOpenNotificationModal={() => setShowNotificationModal(true)}
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
                  onPreviewImage={(img, sender, ts) =>
                    setPreviewImage({ image: img, senderName: sender, timestamp: ts })
                  }
                />

                {/* Input Capsule Area */}
                <div
                  className={`shrink-0 px-3 md:px-6 py-2 md:py-3 transition-all duration-150 ${
                    isKeyboardOpen
                      ? 'pb-2'
                      : 'pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]'
                  }`}
                >
                  <StealthInput
                    onSendMessage={handleSendMessage}
                    onSendImage={handleSendImage}
                    disabled={!cryptoKey}
                  />
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
          onOpenNotificationModal={() => setShowNotificationModal(true)}
          onReconnect={() => networkRef.current?.reconnect()}
          onLeaveRoom={handleLeaveRoom}
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

      {/* Image Lightbox Modal */}
      {previewImage && (
        <ImageLightboxModal
          image={previewImage.image}
          senderName={previewImage.senderName}
          timestamp={previewImage.timestamp}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Ink Splash Screen */}
      {showSplash && <SplashScreen onFinish={handleFinishSplash} />}

      {/* In-App Update Modal */}
      {showUpdateModal && versionInfo && (
        <UpdateModal
          versionInfo={versionInfo}
          onClose={() => setShowUpdateModal(false)}
        />
      )}

      {/* Notification Diagnostics & Testing Modal */}
      {showNotificationModal && (
        <NotificationModal onClose={() => setShowNotificationModal(false)} />
      )}
    </div>
  );
};

export default App;
