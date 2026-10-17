import React from 'react';
import { LogOut, Lock, Unlock, Users, Bell } from 'lucide-react';
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
  onOpenNotificationModal?: () => void;
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
  onOpenNotificationModal,
  onReconnect,
  onLeaveRoom,
}) => {
  // Connection dot colors aligned to restrained palette (竹青玉色 connected, 朱砂红 disconnected)
  const statusDotColor = {
    connected: 'bg-[#4E7A6B] shadow-[0_0_6px_#4E7A6B]',
    connecting: 'bg-[#9E2A2B]/70 animate-pulse',
    disconnected: 'bg-[#9E2A2B]',
    error: 'bg-[#9E2A2B]',
  }[connectionState];

  const isAdmin = userName === '夜星' || userRole === 'admin';

  return (
    <header className="w-full shrink-0 px-3 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] pb-2.5 bg-[#141619]/80 backdrop-blur-md border-b border-[rgba(230,228,221,0.08)] flex items-center justify-between select-none z-20">
      {/* ===== Left Section ===== */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Brand Seal (4px micro-rounded Cinnabar Seal) */}
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-[4px] bg-[#9E2A2B] text-[#E6E4DD] border border-[#B83B2B]/40 flex items-center justify-center font-serif text-xs font-bold shadow-[0_1px_8px_rgba(158,42,43,0.3)] shrink-0">
            墨
          </span>
          <span className="font-serif-zen text-sm tracking-[0.25em] text-[#E6E4DD] font-medium hidden sm:inline">
            墨隐
          </span>
        </div>

        {/* Desktop: Room Token */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#141619]/60 border border-[rgba(230,228,221,0.08)] text-xs font-serif tracking-[0.15em] text-[#E6E4DD]">
          <span className="font-serif font-medium">{roomId}</span>
        </div>

        {/* Desktop: Online Status & Seat Button */}
        <button
          type="button"
          onClick={onOpenMembers}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#141619]/60 hover:bg-[#141619] border border-[rgba(230,228,221,0.08)] text-xs font-serif text-[#6E737B] hover:text-[#E6E4DD] transition-all cursor-pointer active:scale-95"
          title="点击查看席位成员名册与在线状态"
        >
          <Users className="w-3.5 h-3.5 text-[#6E737B]" strokeWidth={1.8} />
          <span>在席</span>
          <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`} />
          <span className="font-mono text-[11px] lining-nums tabular-nums text-[#E6E4DD]">
            {peerCount}
          </span>
        </button>

        {/* Desktop: Reconnect link if disconnected */}
        {connectionState !== 'connected' && (
          <button
            type="button"
            onClick={onReconnect}
            className="hidden md:inline-block text-[10px] text-[#9E2A2B] hover:text-[#B83B2B] font-serif underline underline-offset-2 ml-1 cursor-pointer"
          >
            重连
          </button>
        )}

        {/* Mobile: Compact Room Token with Jade/Red Status Dot */}
        <div className="flex md:hidden items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#141619]/60 border border-[rgba(230,228,221,0.08)] text-xs font-serif tracking-[0.1em] text-[#E6E4DD]">
          <span className="font-medium truncate max-w-[100px]">{roomId}</span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColor}`} />
        </div>
      </div>

      {/* ===== Right Section ===== */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Desktop-only: Notification Diagnostics */}
        {onOpenNotificationModal && (
          <button
            type="button"
            onClick={onOpenNotificationModal}
            className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[#141619]/60 hover:bg-[#141619] border border-[rgba(230,228,221,0.08)] text-xs font-serif text-[#6E737B] hover:text-[#E6E4DD] transition-all cursor-pointer"
            title="信函通知与悬浮横幅状态诊断及测试"
          >
            <Bell className="w-3.5 h-3.5 text-[#E6E4DD]/80" strokeWidth={1.8} />
            <span>通知</span>
          </button>
        )}

        {/* Desktop-only: AFK Privacy Lock Button */}
        <button
          type="button"
          onClick={onToggleAfk}
          className={`hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-[4px] text-xs font-serif transition-all duration-200 cursor-pointer ${
            isAfkLocked
              ? 'bg-[#9E2A2B]/20 border border-[#9E2A2B]/40 text-[#E6E4DD] hover:bg-[#9E2A2B]/30 shadow-[0_2px_10px_rgba(158,42,43,0.25)]'
              : 'bg-[#141619]/60 hover:bg-[#141619] border border-[rgba(230,228,221,0.08)] text-[#6E737B] hover:text-[#E6E4DD]'
          }`}
          title={isAfkLocked ? '点击或按 Esc / Alt+L 解除暂离' : '点击或按 Esc / Alt+L 立即隐匿锁定'}
        >
          {isAfkLocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-[#d15c5c]" strokeWidth={1.8} />
              <span className="tracking-wide">已暂离</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 text-[#6E737B]" strokeWidth={1.8} />
              <span className="tracking-wide">暂离</span>
            </>
          )}
        </button>

        {/* Mobile AFK Indicator (only visible when actively locked) */}
        {isAfkLocked && (
          <button
            type="button"
            onClick={onToggleAfk}
            className="flex md:hidden items-center gap-1 px-2 py-1 rounded-[4px] bg-[#9E2A2B]/20 border border-[#9E2A2B]/40 text-[#d15c5c] text-xs font-serif active:scale-95"
            title="点击解除暂离"
          >
            <Lock className="w-3 h-3 text-[#d15c5c]" strokeWidth={1.8} />
            <span className="text-[10px]">已暂离</span>
          </button>
        )}

        {/* User Identity Badge (Visible on all viewports, exact colors preserved) */}
        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-[4px] bg-[#141619]/60 border border-[rgba(230,228,221,0.08)] text-xs font-serif shrink-0">
          <span className={`truncate font-medium ${userName === '夜星' ? 'text-name-yexing' : 'text-name-xiaoyexing'}`}>
            {userName}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-[3px] font-serif ${
              isAdmin
                ? 'badge-admin'
                : 'badge-user'
            }`}
          >
            {isAdmin ? '管理员' : '用户'}
          </span>
        </div>

        {/* Desktop-only: Logout Button */}
        <button
          onClick={onLeaveRoom}
          className="hidden md:flex p-1.5 rounded-[4px] text-[#6E737B] hover:text-[#d15c5c] hover:bg-[#141619] transition-all cursor-pointer"
          title="离席退室"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.6} />
        </button>

        {/* Mobile: Seat Roster & Drawer Button */}
        <button
          type="button"
          onClick={onOpenMembers}
          className="flex md:hidden items-center gap-1 px-2 py-1 rounded-[4px] bg-[#141619]/60 hover:bg-[#141619] border border-[rgba(230,228,221,0.08)] text-xs font-serif text-[#6E737B] hover:text-[#E6E4DD] transition-all cursor-pointer active:scale-95 shrink-0"
          title="查看席位与更多操作"
        >
          <Users className="w-3.5 h-3.5 text-[#6E737B]" strokeWidth={1.8} />
          <span className="font-mono text-[11px] lining-nums tabular-nums text-[#E6E4DD]">
            {peerCount}
          </span>
          <span className="text-[11px] text-[#6E737B]">席</span>
        </button>
      </div>
    </header>
  );
};
