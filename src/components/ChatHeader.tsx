import React, { useState } from 'react';
import { LogOut, Check, Copy } from 'lucide-react';
import { ConnectionState } from '../types/chat';

interface ChatHeaderProps {
  roomId: string;
  userName: string;
  peerCount: number;
  connectionState: ConnectionState;
  relayUrl?: string;
  onReconnect?: () => void;
  onEditName: () => void;
  onLeaveRoom: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  roomId,
  userName,
  peerCount,
  connectionState,
  relayUrl,
  onReconnect,
  onEditName,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyRoom = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusDotColor = {
    connected: 'bg-[#5b9e7c]',
    connecting: 'bg-[#b8924b] animate-pulse',
    disconnected: 'bg-[#ab3838]',
    error: 'bg-[#ab3838]',
  }[connectionState];

  return (
    <header className="w-full shrink-0 px-4 md:px-7 py-3 ink-panel border-b border-white/[0.06] flex items-center justify-between select-none z-20">
      {/* Left: Brand & Room */}
      <div className="flex items-center gap-3">
        {/* Brand Seal */}
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md seal-bg seal-red flex items-center justify-center font-serif text-[11px] font-bold">
            墨
          </span>
          <span className="font-serif tracking-widest text-sm text-[#e4e0d5] hidden sm:inline">
            墨隐
          </span>
        </div>

        {/* Room Token */}
        <button
          onClick={handleCopyRoom}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-serif text-[#c2baa8] transition-all cursor-pointer"
        >
          <span className="font-serif text-[#ece8df] max-w-[100px] md:max-w-none truncate">{roomId}</span>
          {copied ? (
            <Check className="w-3 h-3 text-[#5b9e7c]" strokeWidth={2} />
          ) : (
            <Copy className="w-3 h-3 text-slate-500 opacity-60" strokeWidth={1.5} />
          )}
        </button>

        {/* Subtle Status Indicator & Count */}
        <div
          onClick={connectionState !== 'connected' ? onReconnect : undefined}
          className={`flex items-center gap-1.5 text-xs text-slate-500 ${
            connectionState !== 'connected' ? 'cursor-pointer hover:text-slate-300' : ''
          }`}
          title={relayUrl ? `中继: ${relayUrl}` : undefined}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`} />
          <span className="font-serif text-[11px] text-[#787f90]">{peerCount}</span>
        </div>
      </div>

      {/* Right: User Nickname & Leave Room */}
      <div className="flex items-center gap-2">
        {/* Custom Nickname */}
        <button
          onClick={onEditName}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-serif text-[#d6d0c2] transition-all"
        >
          <span>「{userName}」</span>
        </button>

        {/* Leave Room Button */}
        <button
          onClick={onLeaveRoom}
          className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-white/[0.04] transition-all"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};
