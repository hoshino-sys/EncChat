import React, { useState, useMemo } from 'react';
import { Lock, Unlock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ChatMessage } from '../types/chat';

interface StealthBubbleProps {
  message: ChatMessage;
  isAltPressed: boolean;
}

export const StealthBubble: React.FC<StealthBubbleProps> = ({ message, isAltPressed }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  // Reveal condition: Windows (Alt + Hover) OR Mobile (Touch and hold)
  const isRevealed = (isHovered && isAltPressed) || isTouched;

  // Format time
  const timeString = useMemo(() => {
    const date = new Date(message.timestamp);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }, [message.timestamp]);

  // Generate masked placeholder representation matching original length
  const maskedContent = useMemo(() => {
    // Generate a stylized, believable cipher mask
    const length = message.decryptedText ? Math.max(message.decryptedText.length, 6) : 10;
    const dotCount = Math.min(Math.max(length, 8), 24);
    return '●'.repeat(dotCount);
  }, [message.decryptedText]);

  // Short hash from IV/ciphertext for cyber stealth aesthetics
  const cipherDigest = useMemo(() => {
    if (!message.encrypted?.ciphertext) return 'AES-256';
    return message.encrypted.ciphertext.slice(0, 8);
  }, [message.encrypted]);

  const handleTouchStart = () => {
    setIsTouched(true);
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch (e) {
        // Ignore vibration errors if restricted
      }
    }
  };

  const handleTouchEnd = () => {
    setIsTouched(false);
  };

  const isSelf = message.isSelf;

  return (
    <div
      className={`group flex flex-col mb-4 transition-all duration-200 select-none ${
        isSelf ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender name & timestamp */}
      <div className="flex items-center gap-1.5 px-1 mb-1 text-[11px] text-slate-400">
        <span className={`font-medium ${isSelf ? 'text-blue-400' : 'text-slate-300'}`}>
          {isSelf ? `${message.senderName} (我)` : message.senderName}
        </span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-400 font-mono text-[10px]">{timeString}</span>
        {isRevealed && (
          <span className="inline-flex items-center gap-0.5 text-emerald-400 text-[10px] font-mono animate-fade-in">
            <ShieldCheck className="w-3 h-3" />
            已解密
          </span>
        )}
      </div>

      {/* Bubble Container */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl p-3.5 transition-all duration-200 cursor-pointer backdrop-blur-md border ${
          isRevealed
            ? isSelf
              ? 'bg-blue-950/40 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.2)] text-blue-50'
              : 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)] text-emerald-50'
            : isSelf
            ? 'bg-[#151926]/90 border-[#252c42] hover:border-[#384364] text-slate-400'
            : 'bg-[#10121a]/90 border-[#1f2434] hover:border-[#2f374e] text-slate-400'
        }`}
        title="Windows: 按住 Alt + 鼠标悬停 | 手机: 长按查看"
      >
        {/* Decrypted plain text view */}
        {isRevealed ? (
          <div className="animate-fade-in">
            {message.decryptionError ? (
              <div className="flex items-center gap-2 text-rose-400 text-sm py-1 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>[解密失败：房间密码不一致]</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words text-[14px] md:text-[15px] leading-relaxed font-sans text-slate-100">
                {message.decryptedText || '（空白消息）'}
              </div>
            )}
            <div className="mt-2 pt-1.5 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-300 font-mono">
              <span className="flex items-center gap-1">
                <Unlock className="w-3 h-3 text-emerald-400" />
                松开即恢复遮罩
              </span>
              <span className="opacity-70">AES-256-GCM</span>
            </div>
          </div>
        ) : (
          /* Masked anti-peep view */
          <div>
            <div className="flex items-center gap-2 font-mono text-[13px] tracking-wider text-slate-300">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-bold select-none text-slate-300 tracking-widest">
                {maskedContent}
              </span>
            </div>

            {/* Subtle stealth micro-info */}
            <div className="mt-2 pt-1 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="text-[9px] text-slate-400">
                <span className="hidden md:inline">按住 Alt 悬停查看</span>
                <span className="md:hidden">长按气泡查看</span>
              </span>
              <span className="text-slate-400 text-[9px]">#{cipherDigest}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
