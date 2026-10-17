import React, { useEffect, useRef } from 'react';
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, systemNotices]);

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 md:px-8 py-6 space-y-3 select-none ink-scroll-mask">
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
