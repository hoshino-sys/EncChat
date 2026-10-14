import React from 'react';
import { PeerUser, ConnectionState } from '../types/chat';
import { Lock, Unlock } from 'lucide-react';

interface MemberListCardProps {
  currentUser: '夜星' | '小夜星';
  peers: PeerUser[];
  connectionState: ConnectionState;
  isAfkLocked: boolean;
  onToggleAfk: () => void;
}

export const MemberListCard: React.FC<MemberListCardProps> = ({
  currentUser,
  peers,
  connectionState,
  isAfkLocked,
  onToggleAfk,
}) => {
  // Check online status
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
    <div className="w-full h-full flex flex-col justify-between white-glass rounded-3xl p-5 border border-white/20 select-none">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md seal-bg seal-red flex items-center justify-center font-serif text-xs font-bold shadow-[0_2px_8px_rgba(171,56,56,0.3)]">
              墨
            </span>
            <div>
              <h2 className="font-serif text-sm tracking-widest text-[#ffffff] font-medium">
                墨隐 · 席位
              </h2>
            </div>
          </div>

          {/* Connection badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-serif">
            {connectionState === 'connected' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#5b9e7c] shadow-[0_0_6px_#5b9e7c]" />
                <span className="text-[#a8b0c0]">畅通</span>
              </>
            ) : connectionState === 'connecting' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#b8924b] animate-pulse" />
                <span className="text-[#a8b0c0]">连结中</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#ab3838]" />
                <span className="text-[#a8b0c0]">断开</span>
              </>
            )}
          </div>
        </div>

        {/* Member Roster */}
        <div className="space-y-3">
          <div className="text-[11px] font-serif text-[#8f96a5] tracking-widest px-1">
            预设成员名册
          </div>

          <div className="space-y-2">
            {roster.map((member) => (
              <div
                key={member.name}
                className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-200 ${
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

                  {/* Name & Self Badge */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif text-[14px] text-[#ffffff] font-medium">
                        {member.name}
                      </span>
                      {member.isSelf && (
                        <span className="text-[10px] font-serif text-[#c2baa8] opacity-75">
                          (当前)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-serif text-[#8c93a3]">
                      {member.isOnline ? '在席' : '离席'}
                    </div>
                  </div>
                </div>

                {/* Role badge */}
                <div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-serif ${
                      member.isAdmin
                        ? 'seal-bg seal-red font-semibold'
                        : 'bg-white/[0.06] text-[#b0b6c6] border border-white/10'
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: AFK Mode & Encryption Status */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        {/* AFK Trigger Button */}
        <button
          type="button"
          onClick={onToggleAfk}
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
            <span>{isAfkLocked ? '席位已暂离 (锁定中)' : '暂离隐匿'}</span>
          </div>
          <span className="text-[10px] opacity-60">
            {isAfkLocked ? '点击解锁' : '锁闭查阅'}
          </span>
        </button>

        {/* E2EE Info */}
        <div className="px-1 text-[10px] font-serif text-[#6c7384] space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#5b9e7c]" />
            <span>端对端加密 (AES-256-GCM)</span>
          </div>
          <div>中继零知存储 · 阅后无痕</div>
        </div>
      </div>
    </div>
  );
};
