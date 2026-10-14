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
        network.connect(session.roomId, session.userId, session.userName);
      } catch (err) {
        console.error('Failed to initialize room:', err);
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

  const handleJoinRoom = (newSession: RoomSession) => {
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
    }
  };

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
      {/* Join/Create Modal */}
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
            relayUrl={networkRef.current?.getWsUrl()}
            onReconnect={() => networkRef.current?.reconnect()}
            onEditName={() => setIsEditingName(true)}
            onLeaveRoom={handleLeaveRoom}
          />

          {/* Messages Stream */}
          <main className="flex-1 overflow-hidden flex flex-col relative max-w-3xl w-full mx-auto">
            <MessageList
              messages={messages}
              systemNotices={systemNotices}
              isAltPressed={isAltPressed}
            />

            {/* Input Capsule Area */}
            <div className="shrink-0 px-4 md:px-6 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <StealthInput onSendMessage={handleSendMessage} disabled={!cryptoKey} />
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
