import React, { useState } from 'react';
import { Shield, Users, LogOut, Copy, Check, Edit2, ShieldAlert } from 'lucide-react';
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

  const statusColor = {
    connected: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    connecting: 'bg-amber-500 animate-ping',
    disconnected: 'bg-rose-500',
    error: 'bg-rose-500',
  }[connectionState];

  const statusText = {
    connected: '实时加密已连接',
    connecting: '正在重连中...',
    disconnected: '未连接',
    error: '连接异常',
  }[connectionState];

  return (
    <header className="w-full shrink-0 px-3 md:px-6 py-2.5 bg-[#0e1019]/90 backdrop-blur-md border-b border-[#1d2235] flex items-center justify-between select-none z-20">
      {/* Left: Brand & Room ID */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-bold tracking-tight text-sm text-slate-100 hidden sm:inline">
            EncChat
          </span>
        </div>

        {/* Room ID Tag */}
        <button
          onClick={handleCopyRoom}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#151825] hover:bg-[#1c2132] border border-[#23283c] text-xs font-mono text-slate-200 transition-all cursor-pointer group"
          title="点击复制房间号"
        >
          <span className="text-slate-400 text-[11px]">#</span>
          <span className="font-semibold text-slate-200 max-w-[110px] md:max-w-none truncate">{roomId}</span>
          {copied ? (
            <Check className="w-3 h-3 text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-200" />
          )}
        </button>

        {/* Connection status dot & Peer count */}
        <div
          onClick={connectionState !== 'connected' ? onReconnect : undefined}
          className={`flex items-center gap-1.5 text-xs text-slate-400 ${
            connectionState !== 'connected' ? 'cursor-pointer hover:text-slate-200' : ''
          }`}
          title={`${statusText}${relayUrl ? `\n中继服务: ${relayUrl}` : ''}${
            connectionState !== 'connected' ? '\n(点击尝试手动重连)' : ''
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="hidden md:inline text-[11px] font-mono">{statusText}</span>
          <span className="hidden md:inline text-slate-700">|</span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <Users className="w-3 h-3 text-slate-400" />
            <span>{peerCount}</span>
          </span>
        </div>
      </div>

      {/* Center: Anti-peep hint badge (Prominent yet minimalist) */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/20 border border-blue-800/30 text-[11px] font-mono text-blue-300">
        <ShieldAlert className="w-3 h-3 text-blue-400" />
        <span>Windows: 按住 Alt + 鼠标悬停查看 | 手机: 长按气泡查看</span>
      </div>

      {/* Right: User Nickname & Leave Room */}
      <div className="flex items-center gap-2">
        {/* Custom Nickname button */}
        <button
          onClick={onEditName}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#151825] hover:bg-[#1e2335] border border-[#23283c] text-xs text-slate-300 hover:text-white transition-all group"
          title="点击修改昵称"
        >
          <span className="text-blue-400 font-mono text-[11px]">@</span>
          <span className="font-medium max-w-[80px] md:max-w-[120px] truncate">{userName}</span>
          <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-slate-200" />
        </button>

        {/* Leave Room Button */}
        <button
          onClick={onLeaveRoom}
          className="p-1.5 rounded-xl bg-slate-800/40 hover:bg-rose-950/60 border border-slate-700/40 hover:border-rose-700/60 text-slate-400 hover:text-rose-300 transition-all"
          title="主动退出 / 关闭房间"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
