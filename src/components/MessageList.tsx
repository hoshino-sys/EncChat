import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { ChatMessage, DecryptedImagePayload } from '../types/chat';
import { StealthBubble } from './StealthBubble';

interface MessageListProps {
  messages: ChatMessage[];
  systemNotices: string[];
  isComboActive: boolean;
  currentUserName?: string;
  isAfkLocked?: boolean;
  onMarkRead?: (messageId: string) => void;
  onPreviewImage?: (image: DecryptedImagePayload, senderName: string, timestamp: number) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  systemNotices,
  isComboActive,
  currentUserName,
  isAfkLocked = false,
  onMarkRead,
  onPreviewImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);
  const prevMsgLengthRef = useRef(0);

  // Instant snap to bottom without rolling animation
  const instantScrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  // 1. Initial mount or cached message hydration: INSTANT 0ms jump to bottom
  useLayoutEffect(() => {
    if (isInitialMountRef.current) {
      instantScrollToBottom();
      if (messages.length > 0) {
        isInitialMountRef.current = false;
        prevMsgLengthRef.current = messages.length;
      }
    }
  }, [messages]);

  // Ensure scroll is anchored after layout passes (e.g. font / image render)
  useEffect(() => {
    if (isInitialMountRef.current && messages.length > 0) {
      const raf = requestAnimationFrame(() => {
        instantScrollToBottom();
        isInitialMountRef.current = false;
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [messages]);

  // 2. Incremental real-time messages: smooth scroll when a NEW message is added
  useEffect(() => {
    if (isInitialMountRef.current) return;

    if (messages.length > prevMsgLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgLengthRef.current = messages.length;
  }, [messages.length, systemNotices.length]);

  // 3. Keep scroll pinned when virtual keyboard appears / visualViewport resizes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportResize = () => {
      instantScrollToBottom();
    };

    window.visualViewport.addEventListener('resize', handleViewportResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full overflow-y-auto px-4 md:px-8 py-6 space-y-3 select-none ink-scroll-mask"
    >
      {/* System Notices */}
      {systemNotices.map((notice, idx) => (
        <div key={`notice-${idx}`} className="flex justify-center my-2">
          <div className="px-3 py-1 rounded-[4px] bg-[#141619]/60 border border-[rgba(230,228,221,0.06)] text-[11px] font-sans text-[#6E737B] tracking-wider animate-fadeIn">
            {notice}
          </div>
        </div>
      ))}

      {/* Messages */}
      {messages.map((msg) => (
        <StealthBubble
          key={msg.id}
          message={msg}
          isComboActive={isComboActive}
          currentUserName={currentUserName}
          isAfkLocked={isAfkLocked}
          onMarkRead={onMarkRead}
          onPreviewImage={onPreviewImage}
        />
      ))}

      <div ref={bottomRef} className="h-6" />
    </div>
  );
};
