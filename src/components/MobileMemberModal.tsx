import React from 'react';
import { X, Users, Lock, Unlock, Bell, LogOut, RotateCcw } from 'lucide-react';
import { PeerUser, ConnectionState } from '../types/chat';

interface MobileMemberModalProps {
  currentUser: '夜星' | '小夜星';
  peers: PeerUser[];
  connectionState: ConnectionState;
  isAfkLocked: boolean;
  onToggleAfk: () => void;
  onOpenNotificationModal?: () => void;
  onReconnect?: () => void;
  onLeaveRoom?: () => void;
  onClose: () => void;
}

export const MobileMemberModal: React.FC<MobileMemberModalProps> = ({
  currentUser,
  peers,
  connectionState,
  isAfkLocked,
  onToggleAfk,
  onOpenNotificationModal,
  onReconnect,
  onLeaveRoom,
  onClose,
}) => {
  const [isMounted, setIsMounted] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 280);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isYeXingOnline =
    (currentUser === '夜星' && connectionState === 'connected') ||
    peers.some((p) => p.name === '夜星');

  const isXiaoYeXingOnline =
    (currentUser === '小夜星' && connectionState === 'connected') ||
    peers.some((p) => p.name === '小夜星');

  const roster = [
    {
      name: '夜星' as const,
      role: '管理员' as const,
      isAdmin: true,
      isOnline: isYeXingOnline,
      isSelf: currentUser === '夜星',
    },
    {
      name: '小夜星' as const,
      role: '用户' as const,
      isAdmin: false,
      isOnline: isXiaoYeXingOnline,
      isSelf: currentUser === '小夜星',
    },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0A0B0D]/85 backdrop-blur-xl select-none transition-opacity duration-300 ease-out ${
        isMounted && !isClosing ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className="fixed inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        className={`relative w-full sm:max-w-sm rounded-t-[14px] sm:rounded-[8px] bg-[#141619]/95 p-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] border border-[rgba(230,228,221,0.08)] shadow-[0_24px_70px_rgba(0,0,0,0.9)] z-10 space-y-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMounted && !isClosing
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-full sm:translate-y-8 opacity-0 sm:scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(230,228,221,0.08)]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6E737B]" strokeWidth={1.8} />
            <h3 className="font-serif text-base text-[#E6E4DD] font-medium tracking-[0.2em]">
              席位名册
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-[#0A0B0D]/50 border border-[rgba(230,228,221,0.08)] text-[10px] font-sans">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-[#4E7A6B] shadow-[0_0_6px_#4E7A6B]'
                    : 'bg-[#9E2A2B]'
                }`}
              />
              <span className="text-[#6E737B]">
                {connectionState === 'connected' ? '畅通' : '连结中'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-[4px] text-[#6E737B] hover:text-[#E6E4DD] hover:bg-[rgba(230,228,221,0.06)] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Member Roster */}
        <div className="space-y-2.5">
          {roster.map((member) => (
            <div
              key={member.name}
              className={`flex items-center justify-between p-3.5 rounded-[6px] transition-all duration-200 ${
                member.isSelf
                  ? 'bg-[#1e2227]/80 border border-[rgba(230,228,221,0.18)] shadow-sm'
                  : 'bg-[#0A0B0D]/40 border border-[rgba(230,228,221,0.06)]'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Status dot with pulse */}
                <div className="relative flex items-center justify-center">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      member.isOnline
                        ? 'bg-[#4E7A6B] shadow-[0_0_8px_#4E7A6B]'
                        : 'bg-[#6E737B]/40'
                    }`}
                  />
                  {member.isOnline && (
                    <span className="absolute w-4 h-4 rounded-full bg-[#4E7A6B]/30 animate-ping" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-serif text-[15px] font-medium tracking-wide ${member.name === '夜星' ? 'text-name-yexing' : 'text-name-xiaoyexing'}`}>
                      {member.name}
                    </span>
                    {member.isSelf && (
                      <span className="text-[10px] font-sans text-[#6E737B]">
                        (当前席位)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-sans text-[#6E737B]">
                    {member.isOnline ? '在席活跃' : '暂未在席'}
                  </div>
                </div>
              </div>

              <div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-[3px] font-sans ${
                    member.isAdmin
                      ? 'badge-admin font-medium'
                      : 'badge-user font-medium'
                  }`}
                >
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions & Utilities */}
        <div className="pt-3 border-t border-[rgba(230,228,221,0.08)] space-y-2.5">
          {/* Reconnect Option (prominently displayed when disconnected) */}
          {connectionState !== 'connected' && onReconnect && (
            <button
              type="button"
              onClick={() => {
                onReconnect();
              }}
              className="w-full py-2.5 px-3.5 rounded-[4px] font-sans text-xs transition-all duration-200 flex items-center justify-between cursor-pointer bg-[#9E2A2B]/15 hover:bg-[#9E2A2B]/25 border border-[#9E2A2B]/35 text-[#d15c5c]"
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5 text-[#d15c5c]" strokeWidth={1.8} />
                <span>通信通道连结异常</span>
              </div>
              <span className="text-[11px] font-serif underline underline-offset-2">点击重新连结</span>
            </button>
          )}

          {/* Notification Diagnostics */}
          {onOpenNotificationModal && (
            <button
              type="button"
              onClick={() => {
                handleClose();
                setTimeout(() => {
                  onOpenNotificationModal();
                }, 280);
              }}
              className="w-full py-2.5 px-3.5 rounded-[4px] font-sans text-xs transition-all duration-200 flex items-center justify-between cursor-pointer bg-[#141619] hover:bg-[#1e2227] border border-[rgba(230,228,221,0.08)] text-[#E6E4DD]"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-[#4E7A6B]" strokeWidth={1.8} />
                <span>信函通知与横幅状态诊断</span>
              </div>
              <span className="text-[10px] text-[#6db39e] font-sans">自检查测</span>
            </button>
          )}

          {/* AFK Privacy Lock */}
          <button
            type="button"
            onClick={() => {
              onToggleAfk();
              handleClose();
            }}
            className={`w-full py-2.5 px-3.5 rounded-[4px] font-sans text-xs transition-all duration-200 flex items-center justify-between cursor-pointer ${
              isAfkLocked
                ? 'bg-[#9E2A2B]/20 border border-[#9E2A2B]/40 text-[#d15c5c] hover:bg-[#9E2A2B]/30 shadow-[0_2px_10px_rgba(158,42,43,0.25)]'
                : 'bg-[#141619] hover:bg-[#1e2227] border border-[rgba(230,228,221,0.08)] text-[#E6E4DD]'
            }`}
          >
            <div className="flex items-center gap-2">
              {isAfkLocked ? (
                <Lock className="w-3.5 h-3.5 text-[#d15c5c]" strokeWidth={1.8} />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-[#6E737B]" strokeWidth={1.8} />
              )}
              <span>{isAfkLocked ? '当前席位已暂离 (锁定中)' : '快速暂离隐匿'}</span>
            </div>
            <span className="text-[10px] opacity-70">
              {isAfkLocked ? '解除锁定' : '锁闭查阅'}
            </span>
          </button>

          {/* Leave Room Action */}
          {onLeaveRoom && (
            <button
              type="button"
              onClick={() => {
                handleClose();
                onLeaveRoom();
              }}
              className="w-full py-2.5 px-3.5 rounded-[4px] font-sans text-xs transition-all duration-200 flex items-center justify-between cursor-pointer bg-[#141619] hover:bg-[#9E2A2B]/15 border border-[rgba(230,228,221,0.08)] hover:border-[#9E2A2B]/40 text-[#6E737B] hover:text-[#d15c5c]"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span>离席退室</span>
              </div>
              <span className="text-[10px] opacity-70">退出当前房间</span>
            </button>
          )}

          <div className="text-[10px] font-serif text-[#6E737B]/60 text-center tracking-[0.2em] pt-1">
            墨隐 · 席位通信
          </div>
        </div>
      </div>
    </div>
  );
};
