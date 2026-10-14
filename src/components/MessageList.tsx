import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types/chat';
import { StealthBubble } from './StealthBubble';

interface MessageListProps {
  messages: ChatMessage[];
  systemNotices: string[];
  isAltPressed: boolean;
  isAfkLocked?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  systemNotices,
  isAltPressed,
  isAfkLocked = false,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, systemNotices]);

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 md:px-8 py-6 space-y-2 select-none">
      {/* System Notices */}
      {systemNotices.map((notice, idx) => (
        <div key={`notice-${idx}`} className="flex justify-center my-2">
          <div className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-serif text-[#9da3b2] tracking-wider animate-fade-in">
            {notice}
          </div>
        </div>
      ))}

      {/* Messages */}
      {messages.map((msg) => (
        <StealthBubble
          key={msg.id}
          message={msg}
          isAltPressed={isAltPressed}
          isAfkLocked={isAfkLocked}
        />
      ))}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
};
