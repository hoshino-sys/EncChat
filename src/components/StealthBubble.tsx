import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { ChatMessage } from '../types/chat';
import { generateMaskedRunes, getCharCount } from '../utils/maskCipher';
import { useScrambleDecrypt } from '../hooks/useScrambleDecrypt';

interface StealthBubbleProps {
  message: ChatMessage;
  isComboActive: boolean; // Ctrl + Space combination active
  currentUserName?: string;
  isAfkLocked?: boolean;
  onMarkRead?: (messageId: string) => void;
}

export const StealthBubble: React.FC<StealthBubbleProps> = ({
  message,
  isComboActive,
  currentUserName,
  isAfkLocked = false,
  onMarkRead,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isTapActive, setIsTapActive] = useState(false);
  const [isRightClickDown, setIsRightClickDown] = useState(false);
  const tapTimerRef = useRef<number | null>(null);

  // Global mouseup to release right-click hold reliably
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        setIsRightClickDown(false);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  // Reveal condition:
  // 1. Mobile touch: Tap reveals for 3 seconds with countdown
  // 2. PC Desktop: Ctrl + Space + Right-Click held down on the bubble
  const isRevealed =
    !isAfkLocked &&
    (isTapActive || (isComboActive && isRightClickDown && isHovered));

  // Determine whether message is sent by current user across all devices/sessions
  const isSelf = Boolean(
    message.isSelf ||
    (currentUserName && message.senderName === currentUserName)
  );
  const isYeXing = message.senderName === '夜星';

  // Mark message as read when recipient deciphers/reveals it
  useEffect(() => {
    if (isRevealed && !isSelf && !message.isRead && onMarkRead) {
      onMarkRead(message.id);
    }
  }, [isRevealed, isSelf, message.isRead, message.id, onMarkRead]);

  // Format time (HH:mm) with lining numbers
  const timeString = useMemo(() => {
    const date = new Date(message.timestamp);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }, [message.timestamp]);

  // Exact 1-to-1 Esoteric Rune Masking
  const maskedGlyphs = useMemo(() => {
    const count = message.decryptedText
      ? getCharCount(message.decryptedText)
      : (message.charCount || 6);
    return generateMaskedRunes(count, message.id || String(message.timestamp));
  }, [message.decryptedText, message.charCount, message.id, message.timestamp]);

  // Decryption Scramble Transition Effect
  const scrambleText = useScrambleDecrypt({
    targetText: message.decryptedText || '',
    maskedRunes: maskedGlyphs,
    isRevealed,
  });

  // Handle mobile finger tap (3 seconds reveal) - PC mouse click is ignored!
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only mobile touch taps trigger 3s reveal; PC mouse clicks do nothing
    if (e.pointerType !== 'touch') {
      return;
    }
    if (isAfkLocked) return;

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    if (isTapActive) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      setIsTapActive(false);
    } else {
      setIsTapActive(true);
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = window.setTimeout(() => {
        setIsTapActive(false);
        tapTimerRef.current = null;
      }, 3000);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2) {
      e.preventDefault();
      if (!isAfkLocked) {
        setIsRightClickDown(true);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2) {
      setIsRightClickDown(false);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsRightClickDown(false);
  };

  return (
    <div
      className={`group flex flex-col mb-4 transition-all duration-300 select-none ${
        isSelf ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender info, time & Read/Unread status */}
      <div className="flex items-center gap-2 px-1.5 mb-1.5 text-[11px] font-serif tracking-wider">
        <div className="flex items-center gap-1.5">
          {/* 夜星 = 金色文字; 小夜星 = 红色文字 */}
          <span
            className={`font-medium tracking-wide ${
              isYeXing ? 'text-name-gold' : 'text-name-red'
            }`}
          >
            {message.senderName}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-serif ${
              isYeXing
                ? 'seal-bg text-[#e5c158] border border-[#e5c158]/30 font-medium'
                : 'bg-[#e05353]/10 text-[#e05353] border border-[#e05353]/30 font-medium'
            }`}
          >
            {isYeXing ? '管理员' : '用户'}
          </span>
        </div>

        <span className="opacity-45 text-[10px] font-mono lining-nums tabular-nums text-[#a4a9b6]">
          {timeString}
        </span>

        {/* Sender: Show Read / Unread status */}
        {isSelf && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-serif tracking-wider transition-colors duration-200 ${
              message.isRead
                ? 'text-[#6dbb89] opacity-95 font-medium'
                : 'text-[#d6a75d] opacity-85'
            }`}
            title={message.isRead ? '对方已解印查阅' : '对方尚未查阅'}
          >
            {message.isRead ? (
              <>
                <CheckCheck className="w-3 h-3 text-[#6dbb89]" strokeWidth={2.2} />
                <span>已读</span>
              </>
            ) : (
              <>
                <Check className="w-2.5 h-2.5 text-[#d6a75d]" strokeWidth={2} />
                <span>未读</span>
              </>
            )}
          </span>
        )}

        {/* Recipient: Show unviewed badge if message hasn't been deciphered yet */}
        {!isSelf && !message.isRead && (
          <span
            className="inline-flex items-center gap-1 text-[9px] font-serif text-[#e05353] bg-[#e05353]/15 border border-[#e05353]/30 px-1.5 py-0.2 rounded font-medium shadow-[0_1px_6px_rgba(224,83,83,0.2)] animate-pulse"
            title="尚未解密查阅"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#e05353]" />
            <span>未阅</span>
          </span>
        )}
      </div>

      {/* White Frosted Glass Bubble (白透毛玻璃) */}
      <div
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative max-w-[85%] md:max-w-[72%] rounded-2xl px-4 py-3 transition-all duration-200 overflow-hidden ${
          isRevealed
            ? 'white-glass-bubble-revealed shadow-[0_8px_32px_rgba(255,255,255,0.08)] scale-[1.01] animate-decipher-glow'
            : isSelf
            ? 'white-glass-bubble hover:border-white/30 hover:bg-white/[0.11]'
            : 'white-glass-bubble hover:border-white/30 hover:bg-white/[0.11]'
        }`}
      >
        {isRevealed ? (
          /* Decrypted Plaintext with Scramble Transition */
          <div className="animate-fade-in">
            {message.decryptionError ? (
              <span className="text-slate-400 text-xs font-serif tracking-widest">[解印有误]</span>
            ) : (
              <div className="whitespace-pre-wrap break-words text-[14px] md:text-[15px] leading-relaxed font-serif text-[#ffffff] tracking-wide select-text">
                {scrambleText}
              </div>
            )}
          </div>
        ) : (
          /* 1-to-1 Esoteric Rune Glyphs Mask */
          <div className="py-0.5 overflow-hidden">
            <span
              className={`font-serif text-[14px] md:text-[15px] tracking-[0.25em] select-none block transition-opacity duration-200 ${
                isAfkLocked ? 'text-[#505562] opacity-70' : 'text-[#a3abb8] opacity-85'
              }`}
            >
              {scrambleText}
            </span>
          </div>
        )}

        {/* 3-Second Countdown Progress Hairline (流光倒计时细线 - 仅移动端生效) */}
        {isTapActive && !isAfkLocked && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 pointer-events-none">
            <div className="h-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-countdown-3s" />
          </div>
        )}
      </div>
    </div>
  );
};
