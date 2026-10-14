import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChatMessage } from '../types/chat';
import { generateMaskedRunes, getCharCount } from '../utils/maskCipher';
import { useScrambleDecrypt } from '../hooks/useScrambleDecrypt';

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
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [isRightClickDown, setIsRightClickDown] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Global mouseup to release right-click hold reliably
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        setIsRightClickDown(false);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Reveal condition:
  // PC: Right-click hold OR (Hover + Alt)
  // Mobile: Touch and hold
  const isRevealed =
    !isAfkLocked &&
    (isRightClickDown || (isHovered && isAltPressed) || isTouched);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAfkLocked) return;
    const t = e.touches[0];
    if (t) {
      setTouchPos({ x: t.clientX, y: t.clientY });
    } else if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      setTouchPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setIsTouched(true);
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) {
      setTouchPos({ x: t.clientX, y: t.clientY });
    }
  };

  const handleTouchEnd = () => {
    setIsTouched(false);
    setTouchPos(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      if (!isAfkLocked) {
        setIsRightClickDown(true);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2) {
      setIsRightClickDown(false);
    }
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
        ref={bubbleRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
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
      </div>

      {/* 方案 A: 手机端浮空镜像预览气泡 (Floating Callout above Finger) */}
      {isTouched && !isAfkLocked && touchPos && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 transition-all duration-150 animate-fade-in flex flex-col items-center"
          style={{
            left: `${Math.min(Math.max(touchPos.x, 130), window.innerWidth - 130)}px`,
            top: `${Math.max(touchPos.y - 72, 35)}px`,
          }}
        >
          <div className="white-glass-bubble-revealed px-4 py-2.5 rounded-2xl border border-white/40 shadow-[0_16px_50px_rgba(0,0,0,0.9)] max-w-[85vw] whitespace-pre-wrap break-words text-[15px] font-serif text-[#ffffff] leading-relaxed text-center">
            {scrambleText}
          </div>
          {/* Subtle downward pointer */}
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/40 mt-0.5" />
        </div>
      )}
    </div>
  );
};
