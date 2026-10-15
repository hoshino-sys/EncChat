import React from 'react';
import { X, Users, Lock, Unlock } from 'lucide-react';
import { PeerUser, ConnectionState } from '../types/chat';

interface MobileMemberModalProps {
  currentUser: '夜星' | '小夜星';
  peers: PeerUser[];
  connectionState: ConnectionState;
  isAfkLocked: boolean;
  onToggleAfk: () => void;
  onClose: () => void;
}

export const MobileMemberModal: React.FC<MobileMemberModalProps> = ({
  currentUser,
  peers,
  connectionState,
  isAfkLocked,
  onToggleAfk,
  onClose,
}) => {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-2xl animate-fade-in select-none">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl white-glass p-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] border border-white/20 shadow-[0_24px_70px_rgba(0,0,0,0.85)] z-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ffffff]" strokeWidth={1.8} />
            <h3 className="font-serif text-base text-[#ffffff] font-medium tracking-wider">
              席位名册
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-serif">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-[#5b9e7c] shadow-[0_0_6px_#5b9e7c]'
                    : 'bg-[#ab3838]'
                }`}
              />
              <span className="text-[#c5cbdb]">
                {connectionState === 'connected' ? '通道畅通' : '连结中'}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
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
              className={`flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 ${
                member.isSelf
                  ? 'bg-white/[0.08] border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.2)]'
                  : 'bg-white/[0.03] border border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Status dot with pulse */}
                <div className="relative flex items-center justify-center">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      member.isOnline
                        ? 'bg-[#5b9e7c] shadow-[0_0_10px_#5b9e7c]'
                        : 'bg-[#505562]'
                    }`}
                  />
                  {member.isOnline && (
                    <span className="absolute w-4 h-4 rounded-full bg-[#5b9e7c]/30 animate-ping" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-serif text-[15px] font-medium ${member.isAdmin ? 'text-name-gold' : 'text-name-red'}`}>
                      {member.name}
                    </span>
                    {member.isSelf && (
                      <span className="text-[10px] font-serif text-[#c2baa8] opacity-80">
                        (当前席位)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-serif text-[#9ba1b0]">
                    {member.isOnline ? '在席活跃' : '暂未在席'}
                  </div>
                </div>
              </div>

              <div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-serif ${
                    member.isAdmin
                      ? 'seal-bg text-[#e5c158] border border-[#e5c158]/30 font-semibold'
                      : 'bg-[#e05353]/10 text-[#e05353] border border-[#e05353]/30 font-semibold'
                  }`}
                >
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* AFK and Security note */}
        <div className="pt-3 border-t border-white/10 space-y-3">
          <button
            type="button"
            onClick={() => {
              onToggleAfk();
              onClose();
            }}
            className={`w-full py-2.5 px-3.5 rounded-2xl font-serif text-xs transition-all duration-200 flex items-center justify-between cursor-pointer ${
              isAfkLocked
                ? 'bg-[#ab3838]/20 border border-[#ab3838]/40 text-[#ffb0b0] hover:bg-[#ab3838]/30 shadow-[0_2px_12px_rgba(171,56,56,0.25)]'
                : 'bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-[#e0ded6]'
            }`}
          >
            <div className="flex items-center gap-2">
              {isAfkLocked ? (
                <Lock className="w-3.5 h-3.5 text-[#ff8080]" strokeWidth={1.8} />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-[#a8b0c0]" strokeWidth={1.8} />
              )}
              <span>{isAfkLocked ? '当前席位已暂离 (锁定中)' : '快速暂离隐匿'}</span>
            </div>
            <span className="text-[10px] opacity-70">
              {isAfkLocked ? '解除锁定' : '锁闭查阅'}
            </span>
          </button>

          <div className="text-[10px] font-serif text-[#6c7384] text-center tracking-wide">
            墨隐 · 席位通信
          </div>
        </div>
      </div>
    </div>
  );
};
