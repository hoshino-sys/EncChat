import React from 'react';
import { PeerUser, ConnectionState } from '../types/chat';
import { Lock, Unlock, Users } from 'lucide-react';

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
    <div className="w-full h-full flex flex-col justify-between bg-[#141619]/80 backdrop-blur-md rounded-[8px] p-5 border border-[rgba(230,228,221,0.08)] select-none">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[rgba(230,228,221,0.08)]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#6E737B]" strokeWidth={1.8} />
            <h2 className="font-serif text-sm tracking-[0.2em] text-[#E6E4DD] font-medium">
              席位名册
            </h2>
          </div>

          {/* Connection badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-[#0A0B0D]/50 border border-[rgba(230,228,221,0.08)] text-[10px] font-sans">
            {connectionState === 'connected' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4E7A6B] shadow-[0_0_6px_#4E7A6B]" />
                <span className="text-[#6db39e]">畅通</span>
              </>
            ) : connectionState === 'connecting' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#b8924b] animate-pulse" />
                <span className="text-[#6E737B]">连结中</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#9E2A2B]" />
                <span className="text-[#d15c5c]">断开</span>
              </>
            )}
          </div>
        </div>

        {/* Member Roster */}
        <div className="space-y-3">
          <div className="text-[11px] font-sans text-[#6E737B] tracking-wider px-1">
            预设成员名册
          </div>

          <div className="space-y-2">
            {roster.map((member) => (
              <div
                key={member.name}
                className={`flex items-center justify-between p-3 rounded-[6px] transition-all duration-200 ${
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

                  {/* Name & Self Badge */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-serif text-[14px] font-medium tracking-wide ${member.name === '夜星' ? 'text-name-yexing' : 'text-name-xiaoyexing'}`}>
                        {member.name}
                      </span>
                      {member.isSelf && (
                        <span className="text-[10px] font-sans text-[#6E737B]">
                          (当前)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-sans text-[#6E737B]">
                      {member.isOnline ? '在席' : '离席'}
                    </div>
                  </div>
                </div>

                {/* Role badge */}
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
        </div>
      </div>

      {/* Bottom Section: AFK Mode & Encryption Status */}
      <div className="pt-4 border-t border-[rgba(230,228,221,0.08)] space-y-3">
        {/* AFK Trigger Button */}
        <button
          type="button"
          onClick={onToggleAfk}
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
            <span>{isAfkLocked ? '席位已暂离 (锁定中)' : '暂离隐匿 (Esc)'}</span>
          </div>
          <span className="text-[10px] opacity-70">
            {isAfkLocked ? '点击解锁' : '锁闭查阅'}
          </span>
        </button>

        {/* Minimal Safe Status */}
        <div className="px-1 text-[10px] font-sans text-[#6E737B] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4E7A6B]" />
            <span>通道安全加密</span>
          </div>
          <span className="text-[10px] text-[#6E737B]/60 font-serif tracking-widest">墨隐</span>
        </div>
      </div>
    </div>
  );
};
