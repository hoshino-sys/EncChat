import React from 'react';
import { LogOut, Lock, Unlock, Users } from 'lucide-react';
import { ConnectionState, UserRole } from '../types/chat';

interface ChatHeaderProps {
  roomId: string;
  userName: '夜星' | '小夜星';
  userRole?: UserRole;
  peerCount: number;
  connectionState: ConnectionState;
  isAfkLocked: boolean;
  onToggleAfk: () => void;
  onOpenMembers: () => void;
  onReconnect?: () => void;
  onLeaveRoom: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  roomId,
  userName,
  userRole,
  peerCount,
  connectionState,
  isAfkLocked,
  onToggleAfk,
  onOpenMembers,
  onReconnect,
  onLeaveRoom,
}) => {
  const statusDotColor = {
    connected: 'bg-[#5b9e7c] shadow-[0_0_6px_#5b9e7c]',
    connecting: 'bg-[#b8924b] animate-pulse',
    disconnected: 'bg-[#ab3838]',
    error: 'bg-[#ab3838]',
  }[connectionState];

  const isAdmin = userName === '夜星' || userRole === 'admin';

  return (
    <header className="w-full shrink-0 px-3 sm:px-6 py-2.5 white-glass border-b border-white/10 flex items-center justify-between select-none z-20">
      {/* Left: Brand, Room & Members Trigger */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Brand Seal */}
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md seal-bg seal-red flex items-center justify-center font-serif text-xs font-bold shadow-[0_2px_8px_rgba(171,56,56,0.25)]">
            墨
          </span>
          <span className="font-serif tracking-widest text-sm text-[#ffffff] font-medium hidden sm:inline">
            墨隐
          </span>
        </div>

        {/* Room Token */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-serif text-[#d6d0c2]">
          <span className="font-serif text-[#ffffff] font-medium tracking-wide">
            {roomId}
          </span>
        </div>

        {/* Online Status & Seat Button (Accessible on Mobile and Desktop) */}
        <button
          type="button"
          onClick={onOpenMembers}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-xs font-serif text-[#c5cbe0] transition-all cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.15)] active:scale-95"
          title="点击查看席位成员名册与在线状态"
        >
          <Users className="w-3.5 h-3.5 text-[#9da5b8]" strokeWidth={1.8} />
          <span className="hidden xs:inline">在席</span>
          <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`} />
          <span className="font-serif text-[11px] lining-nums tabular-nums font-mono text-[#ffffff]">
            {peerCount}
          </span>
        </button>

        {connectionState !== 'connected' && (
          <button
            type="button"
            onClick={onReconnect}
            className="text-[10px] text-amber-400/80 hover:text-amber-300 font-serif underline underline-offset-2 ml-1"
          >
            重连
          </button>
        )}
      </div>

      {/* Right: AFK Privacy Button, User Badge & Leave */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* AFK Privacy Lock Button */}
        <button
          type="button"
          onClick={onToggleAfk}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-serif transition-all duration-200 cursor-pointer ${
            isAfkLocked
              ? 'bg-[#ab3838]/20 border border-[#ab3838]/40 text-[#ffb0b0] hover:bg-[#ab3838]/30 shadow-[0_2px_12px_rgba(171,56,56,0.3)]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[#d8d4c8] hover:text-white'
          }`}
          title={isAfkLocked ? '点击输入密符解除暂离' : '点击暂离并锁定笔迹'}
        >
          {isAfkLocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-[#ff8080]" strokeWidth={1.8} />
              <span className="tracking-wide">已暂离</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 text-[#9aa0b0]" strokeWidth={1.8} />
              <span className="tracking-wide">暂离</span>
            </>
          )}
        </button>

        {/* User Identity Badge */}
        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-serif">
          <span className={`max-w-[70px] sm:max-w-none truncate font-medium ${isAdmin ? 'text-name-gold' : 'text-name-red'}`}>
            {userName}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-serif ${
              isAdmin
                ? 'seal-bg text-[#e5c158] border border-[#e5c158]/30 font-medium'
                : 'bg-[#e05353]/10 text-[#e05353] border border-[#e05353]/30 font-medium'
            }`}
          >
            {isAdmin ? '管理员' : '用户'}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLeaveRoom}
          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] transition-all cursor-pointer"
          title="离席退室"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.6} />
        </button>
      </div>
    </header>
  );
};
