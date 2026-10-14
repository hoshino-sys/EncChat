import React, { useState, useMemo } from 'react';
import { ChatMessage } from '../types/chat';
import { generateMaskedRunes, getCharCount } from '../utils/maskCipher';

interface StealthBubbleProps {
  message: ChatMessage;
  isAltPressed: boolean;
  isAfkLocked?: boolean;
}

export const StealthBubble: React.FC<StealthBubbleProps> = ({
  message,
  isAltPressed,
  isAfkLocked = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  // Reveal condition: When NOT in AFK lock, and (Alt+Hover on PC OR Touch+Hold on Mobile)
  const isRevealed = !isAfkLocked && ((isHovered && isAltPressed) || isTouched);

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

  const handleTouchStart = () => {
    if (isAfkLocked) return;
    setIsTouched(true);
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
  };

  const handleTouchEnd = () => {
    setIsTouched(false);
  };

  const isSelf = message.isSelf;
  const isAdmin = message.senderName === '夜星';

  return (
    <div
      className={`group flex flex-col mb-4 transition-all duration-300 select-none ${
        isSelf ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender info & time */}
      <div className="flex items-center gap-2 px-1.5 mb-1.5 text-[11px] font-serif tracking-wider">
        <div className="flex items-center gap-1.5">
          <span className={isSelf ? 'text-[#ffffff] font-medium' : 'text-[#cfd3dc]'}>
            {message.senderName}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-serif ${
              isAdmin
                ? 'seal-bg seal-red font-medium'
                : 'bg-white/[0.06] text-[#9ba0ad] border border-white/10'
            }`}
          >
            {isAdmin ? '管理员' : '用户'}
          </span>
        </div>
        <span className="opacity-45 text-[10px] font-mono lining-nums tabular-nums text-[#a4a9b6]">
          {timeString}
        </span>
      </div>

      {/* White Frosted Glass Bubble (白透毛玻璃) */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`relative max-w-[85%] md:max-w-[72%] rounded-2xl px-4 py-3 transition-all duration-200 cursor-pointer ${
          isRevealed
            ? 'white-glass-bubble-revealed'
            : isSelf
            ? 'white-glass-bubble hover:border-white/30 hover:bg-white/[0.11]'
            : 'white-glass-bubble hover:border-white/30 hover:bg-white/[0.11]'
        }`}
      >
        {isRevealed ? (
          /* Decrypted Plaintext */
          <div className="animate-fade-in">
            {message.decryptionError ? (
              <span className="text-slate-400 text-xs font-serif tracking-widest">[解印有误]</span>
            ) : (
              <div className="whitespace-pre-wrap break-words text-[14px] md:text-[15px] leading-relaxed font-serif text-[#ffffff] tracking-wide select-text">
                {message.decryptedText || ''}
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
              {maskedGlyphs}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
