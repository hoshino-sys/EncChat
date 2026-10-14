import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types/chat';
import { StealthBubble } from './StealthBubble';
import { Shield, Sparkles, Key } from 'lucide-react';

interface MessageListProps {
  messages: ChatMessage[];
  systemNotices: string[];
  isAltPressed: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  systemNotices,
  isAltPressed,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, systemNotices]);

  return (
    <div className="flex-1 w-full overflow-y-auto px-3 md:px-6 py-4 space-y-2 select-none">
      {/* Welcome / Security Banner */}
      <div className="max-w-md mx-auto my-6 p-4 rounded-2xl bg-[#10131d]/80 border border-[#1d2334] text-center space-y-2 shadow-lg backdrop-blur-sm">
        <div className="w-10 h-10 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Shield className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">端到端加密专属房间</h3>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          所有消息在本地经过 AES-256-GCM 高强度加密后发出，服务器只转发密文，无法窥视。
        </p>
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Key className="w-3 h-3 text-amber-400" />
            零知识转发
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            防窥保护已就绪
          </span>
        </div>
      </div>

      {/* System Notices */}
      {systemNotices.map((notice, idx) => (
        <div key={`notice-${idx}`} className="flex justify-center my-2">
          <div className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 animate-fade-in">
            {notice}
          </div>
        </div>
      ))}

      {/* Messages */}
      {messages.map((msg) => (
        <StealthBubble key={msg.id} message={msg} isAltPressed={isAltPressed} />
      ))}

      <div ref={bottomRef} className="h-2" />
    </div>
  );
};
