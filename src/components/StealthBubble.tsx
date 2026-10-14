import React, { useState, useMemo } from 'react';
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

  // Format time (HH:mm)
  const timeString = useMemo(() => {
    const date = new Date(message.timestamp);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }, [message.timestamp]);

  // Abstract ink dot mask (elegant spacing, completely neutral)
  const maskedDots = useMemo(() => {
    const len = message.decryptedText ? Math.max(message.decryptedText.length, 4) : 8;
    const count = Math.min(Math.max(len, 6), 18);
    return '· '.repeat(count).trim();
  }, [message.decryptedText]);

  const handleTouchStart = () => {
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

  return (
    <div
      className={`group flex flex-col mb-3.5 transition-all duration-300 select-none ${
        isSelf ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender name & time */}
      <div className="flex items-center gap-2 px-1.5 mb-1 text-[11px] font-serif text-[#878d99] tracking-wider">
        <span className={isSelf ? 'text-[#c2baa8]' : 'text-[#9c9fa6]'}>
          {message.senderName}
        </span>
        <span className="opacity-40 text-[9px] font-mono">{timeString}</span>
      </div>

      {/* Frosted Glass Ink Bubble */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 transition-all duration-200 cursor-pointer ink-panel-bubble ${
          isRevealed
            ? isSelf
              ? 'bg-[#1b1e28]/80 border-white/20 shadow-[0_4px_28px_rgba(0,0,0,0.6)]'
              : 'bg-[#181b24]/80 border-white/20 shadow-[0_4px_28px_rgba(0,0,0,0.6)]'
            : isSelf
            ? 'hover:border-white/10'
            : 'hover:border-white/10'
        }`}
      >
        {isRevealed ? (
          /* Decrypted Plaintext */
          <div className="animate-fade-in">
            {message.decryptionError ? (
              <span className="text-slate-500 text-xs font-serif tracking-widest">[不符]</span>
            ) : (
              <div className="whitespace-pre-wrap break-words text-[14px] md:text-[15px] leading-relaxed font-serif text-[#f4f1ea] tracking-wide">
                {message.decryptedText || ''}
              </div>
            )}
          </div>
        ) : (
          /* Quiet Ink Mist Mask */
          <div className="py-0.5">
            <span className="text-[#646a78] font-serif text-sm tracking-[0.35em] select-none block">
              {maskedDots}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
