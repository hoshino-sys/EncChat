import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Check, CheckCheck, ImageIcon, Lock, Maximize2 } from 'lucide-react';
import { ChatMessage, DecryptedImagePayload } from '../types/chat';
import { generateMaskedRunes, getCharCount } from '../utils/maskCipher';
import { useScrambleDecrypt } from '../hooks/useScrambleDecrypt';

interface StealthBubbleProps {
  message: ChatMessage;
  isComboActive: boolean; // Ctrl + Space combination active
  currentUserName?: string;
  isAfkLocked?: boolean;
  onMarkRead?: (messageId: string) => void;
  onPreviewImage?: (image: DecryptedImagePayload, senderName: string, timestamp: number) => void;
}

export const StealthBubble: React.FC<StealthBubbleProps> = ({
  message,
  isComboActive,
  currentUserName,
  isAfkLocked = false,
  onMarkRead,
  onPreviewImage,
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
  // 2. PC Desktop: Ctrl + Right-Click held down on the bubble
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
    if (e.pointerType !== 'touch') {
      return;
    }
    if (isAfkLocked) return;

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    setIsTapActive(true);
    tapTimerRef.current = window.setTimeout(() => {
      setIsTapActive(false);
      tapTimerRef.current = null;
    }, 3000);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2) {
      e.preventDefault();
      setIsRightClickDown(true);
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
      className={`flex flex-col mb-4 select-none animate-mist-reveal ${
        isSelf ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender info, time & Read/Unread status */}
      <div className="flex items-center gap-2 px-1.5 mb-1.5 text-[11px] font-sans tracking-wide">
        <div className="flex items-center gap-1.5">
          <span className={`font-serif tracking-[0.12em] font-medium ${isYeXing ? 'text-name-yexing' : 'text-name-xiaoyexing'}`}>
            {message.senderName}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded-[3px] font-serif ${
              isYeXing ? 'badge-admin' : 'badge-user'
            }`}
          >
            {isYeXing ? '管理员' : '用户'}
          </span>
        </div>

        <span className="text-[10px] font-mono lining-nums tabular-nums text-[#6E737B]">
          {timeString}
        </span>

        {/* Sender: Show Read / Unread status (竹青玉色 for read) */}
        {isSelf && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-sans tracking-wider transition-colors duration-200 ${
              message.isRead
                ? 'text-[#4E7A6B] font-medium'
                : 'text-[#6E737B]'
            }`}
            title={message.isRead ? '已读' : '未读'}
          >
            {message.isRead ? (
              <>
                <CheckCheck className="w-3 h-3 text-[#4E7A6B]" strokeWidth={2.2} />
                <span>已读</span>
              </>
            ) : (
              <>
                <Check className="w-2.5 h-2.5 text-[#6E737B]" strokeWidth={2} />
                <span>未读</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Bubble or Image Tile */}
      <div
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative transition-all duration-200 overflow-hidden ${
          message.msgType === 'image'
            ? 'rounded-[8px] border border-[rgba(230,228,221,0.08)] bg-[#141619]/90 shadow-lg'
            : `max-w-[85%] md:max-w-[72%] rounded-[6px] px-4 py-2.5 ${
                isRevealed
                  ? 'ink-bubble-revealed scale-[1.005]'
                  : 'ink-bubble-sealed hover:border-[rgba(230,228,221,0.12)]'
              }`
        }`}
      >
        {message.msgType === 'image' ? (
          /* Image Message Branch */
          <div className="relative">
            {isRevealed ? (
              /* Decrypted Image */
              <div className="animate-fadeIn relative group/img">
                {message.decryptionError ? (
                  <div className="px-6 py-8 text-center text-[#6E737B] text-xs font-sans tracking-wider bg-[#141619] rounded-[6px]">
                    [图片解密失败]
                  </div>
                ) : message.decryptedImage ? (
                  <div
                    className="cursor-pointer relative overflow-hidden rounded-[6px] max-w-[280px] sm:max-w-[340px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPreviewImage && message.decryptedImage) {
                        onPreviewImage(message.decryptedImage, message.senderName, message.timestamp);
                      }
                    }}
                  >
                    <img
                      src={message.decryptedImage.data}
                      alt="图片"
                      className="w-full h-auto object-cover rounded-[6px] border border-[rgba(230,228,221,0.1)] hover:scale-[1.015] transition-transform duration-300"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] bg-[#141619]/90 text-[#E6E4DD] text-xs font-sans shadow-lg border border-[rgba(230,228,221,0.15)]">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>查阅原图</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-[220px] h-[160px] flex items-center justify-center bg-[#141619] rounded-[6px] text-[#6E737B] text-xs font-sans animate-pulse">
                    正在解封...
                  </div>
                )}
              </div>
            ) : (
              /* Sealed Image Tile */
              <div
                className={`w-[180px] sm:w-[220px] p-6 flex flex-col items-center justify-center select-none rounded-[6px] bg-[#141619] border border-[rgba(230,228,221,0.08)] cursor-pointer transition-transform duration-200 ${
                  isHovered ? 'scale-[1.01] border-[#9E2A2B]/40' : ''
                }`}
                style={{
                  aspectRatio: message.imageMeta?.aspectRatio
                    ? Math.max(0.8, Math.min(message.imageMeta.aspectRatio, 1.6))
                    : 1.33,
                  maxHeight: '220px',
                  minHeight: '120px',
                }}
              >
                {/* Corner ancient brackets */}
                <div className="absolute top-2 left-2 text-[#6E737B]/40 text-xs font-mono">⌜</div>
                <div className="absolute top-2 right-2 text-[#6E737B]/40 text-xs font-mono">⌝</div>
                <div className="absolute bottom-2 left-2 text-[#6E737B]/40 text-xs font-mono">⌞</div>
                <div className="absolute bottom-2 right-2 text-[#6E737B]/40 text-xs font-mono">⌟</div>

                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-[#101216] border border-[rgba(230,228,221,0.12)] flex items-center justify-center shadow-inner">
                    <ImageIcon className="w-5 h-5 text-[#6E737B]" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#141619] border border-[#9E2A2B]/50 flex items-center justify-center">
                    <Lock className="w-2.5 h-2.5 text-[#d15c5c]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Text Message Branch */
          <>
            {isRevealed ? (
              /* Decrypted Plaintext with Clean Sans-Serif Typography */
              <div className="animate-fadeIn">
                {message.decryptionError ? (
                  <span className="text-[#6E737B] text-xs font-sans tracking-wide">[解密失败]</span>
                ) : (
                  <div className="whitespace-pre-wrap break-words text-[14px] md:text-[15px] leading-relaxed font-sans text-[#E6E4DD] tracking-normal select-text">
                    {scrambleText}
                  </div>
                )}
              </div>
            ) : (
              /* 1-to-1 Esoteric Rune Glyphs Mask */
              <div className="py-0.5 overflow-hidden">
                <span
                  className={`font-sans text-[14px] md:text-[15px] tracking-[0.25em] select-none block transition-opacity duration-200 ${
                    isAfkLocked ? 'text-[#6E737B]/50' : 'text-[#6E737B] opacity-85'
                  }`}
                >
                  {scrambleText}
                </span>
              </div>
            )}
          </>
        )}

        {/* 3-Second Countdown Progress Hairline (移动端触摸显影进度线) */}
        {isTapActive && !isAfkLocked && (
          <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[rgba(230,228,221,0.08)] pointer-events-none">
            <div className="h-full bg-gradient-to-r from-transparent via-[#E6E4DD]/70 to-transparent animate-countdown-3s" />
          </div>
        )}
      </div>
    </div>
  );
};
