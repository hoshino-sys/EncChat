import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Eye, EyeOff, ImageIcon, X, Loader2 } from 'lucide-react';
import { generateMaskedRunes } from '../utils/maskCipher';
import { formatByteSize } from '../utils/imageCompressor';

interface StealthInputProps {
  onSendMessage: (text: string) => void;
  onSendImage?: (file: File) => Promise<void>;
  disabled?: boolean;
}

interface PendingImage {
  file: File;
  previewUrl: string;
  size: number;
}

export const StealthInput: React.FC<StealthInputProps> = ({
  onSendMessage,
  onSendImage,
  disabled,
}) => {
  const [text, setText] = useState('');
  const [maskedCount, setMaskedCount] = useState(0);
  const [isPeeking, setIsPeeking] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [isSendingImage, setIsSendingImage] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskTimerRef = useRef<number | null>(null);
  const peekTimerRef = useRef<number | null>(null);
  const isComposingRef = useRef(false);

  // Click to peek for 3 seconds instead of long-press
  const handleTogglePeek = () => {
    if (isPeeking) {
      if (peekTimerRef.current) {
        clearTimeout(peekTimerRef.current);
        peekTimerRef.current = null;
      }
      setIsPeeking(false);
      return;
    }

    setIsPeeking(true);
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    peekTimerRef.current = window.setTimeout(() => {
      setIsPeeking(false);
      peekTimerRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    };
  }, []);

  // Sync scroll between textarea and overlay
  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleTextChange = (val: string) => {
    const chars = Array.from(val);
    const newCount = chars.length;
    setText(val);

    if (newCount === 0) {
      setMaskedCount(0);
      if (maskTimerRef.current) {
        clearTimeout(maskTimerRef.current);
        maskTimerRef.current = null;
      }
      return;
    }

    if (newCount < maskedCount) {
      // Deleting characters into the masked portion
      setMaskedCount(newCount);
      if (maskTimerRef.current) {
        clearTimeout(maskTimerRef.current);
        maskTimerRef.current = null;
      }
      return;
    }

    // Characters already masked remain permanently locked
    if (maskTimerRef.current) {
      clearTimeout(maskTimerRef.current);
      maskTimerRef.current = null;
    }

    if (!isComposingRef.current) {
      maskTimerRef.current = window.setTimeout(() => {
        setMaskedCount(newCount);
        maskTimerRef.current = null;
      }, 1000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleTextChange(e.target.value);
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
    if (maskTimerRef.current) {
      clearTimeout(maskTimerRef.current);
      maskTimerRef.current = null;
    }
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false;
    const val = (e.target as HTMLTextAreaElement).value;
    handleTextChange(val);
  };

  // Image Selection Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      setPendingImage({
        file,
        previewUrl,
        size: file.size,
      });
    }
    // Reset file input value so selecting the same file again works
    e.target.value = '';
  };

  // Clipboard Paste (e.g. screenshot paste Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData && e.clipboardData.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const previewUrl = URL.createObjectURL(file);
            setPendingImage({
              file,
              previewUrl,
              size: file.size,
            });
            return;
          }
        }
      }
    }
  };

  const handleCancelPendingImage = () => {
    if (pendingImage?.previewUrl) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }
    setPendingImage(null);
  };

  const handleSend = async () => {
    if (disabled || isSendingImage) return;

    // 1. Send pending image if present
    if (pendingImage && onSendImage) {
      try {
        setIsSendingImage(true);
        await onSendImage(pendingImage.file);
        handleCancelPendingImage();
      } catch (err) {
        console.error('Failed to send image:', err);
      } finally {
        setIsSendingImage(false);
      }
    }

    // 2. Send text message if text present
    const trimmed = text.trim();
    if (trimmed) {
      onSendMessage(trimmed);
      setText('');
      setMaskedCount(0);
      if (maskTimerRef.current) {
        clearTimeout(maskTimerRef.current);
        maskTimerRef.current = null;
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposingRef.current || e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 44), 130);
      textareaRef.current.style.height = `${newHeight}px`;
      if (overlayRef.current) {
        overlayRef.current.style.height = `${newHeight}px`;
      }
    }
  }, [text]);

  useEffect(() => {
    return () => {
      if (maskTimerRef.current) clearTimeout(maskTimerRef.current);
      if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl);
    };
  }, [pendingImage]);

  // Compute visual displayed text
  const displayedContent = (() => {
    if (!text) return null;
    if (isPeeking) {
      return <span className="text-[#E6E4DD] font-sans">{text}</span>;
    }

    const chars = Array.from(text);
    const totalCount = chars.length;
    const safeMaskedCount = Math.min(maskedCount, totalCount);

    const maskedPart = generateMaskedRunes(safeMaskedCount, 'input_per_char');
    const visiblePart = chars.slice(safeMaskedCount).join('');

    return (
      <>
        {safeMaskedCount > 0 && (
          <span className="text-[#6E737B] font-sans text-[15px] tracking-[0.2em] select-none transition-all duration-150">
            {maskedPart}
          </span>
        )}
        {visiblePart && (
          <span className="text-[#E6E4DD] font-sans transition-all duration-150 animate-fade-in">
            {visiblePart}
          </span>
        )}
      </>
    );
  })();

  const canSend = (text.trim().length > 0 || pendingImage !== null) && !disabled && !isSendingImage;

  return (
    <div className="w-full relative select-none">
      {/* Hidden file input for native image picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Pending Image Preview Bar (Above Input Capsule) */}
      {pendingImage && (
        <div className="mb-2 p-2 rounded-[4px] bg-[#141619]/90 border border-[rgba(230,228,221,0.1)] shadow-xl flex items-center justify-between animate-fadeIn backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="relative w-12 h-12 rounded-[4px] overflow-hidden border border-[rgba(230,228,221,0.1)] shrink-0 bg-[#0A0B0D]">
              <img
                src={pendingImage.previewUrl}
                alt="准备发送的密图"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-xs font-serif text-[#E6E4DD] flex items-center space-x-1.5 tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9E2A2B]" />
                <span>密印图函待发</span>
              </div>
              <div className="text-[10px] text-[#6E737B] font-sans mt-0.5">
                {formatByteSize(pendingImage.size)} · 自动压缩与脱敏
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCancelPendingImage}
              disabled={isSendingImage}
              className="p-1.5 rounded-[4px] text-[#6E737B] hover:text-[#E6E4DD] hover:bg-[rgba(230,228,221,0.06)] transition-colors"
              title="取消选择"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Restrained Oriental Ink Input Capsule */}
      <div className="relative flex items-end gap-1.5 p-1.5 rounded-[8px] bg-[#141619]/80 backdrop-blur-md border border-[rgba(230,228,221,0.08)] transition-all duration-200 focus-within:border-[rgba(230,228,221,0.2)] focus-within:bg-[#141619]/95 shadow-lg">
        {/* Real Native Textarea & Dual Layer Container */}
        <div className="relative flex-1 min-h-[44px] max-h-[130px] flex items-center overflow-hidden">
          {/* Visual Overlay Layer (Masked runes or clear text) */}
          <div
            ref={overlayRef}
            aria-hidden="true"
            className="absolute inset-0 px-3 py-2.5 pointer-events-none text-[15px] font-sans leading-relaxed whitespace-pre-wrap break-words overflow-y-auto select-none"
          >
            {displayedContent}
          </div>

          {/* Real Native Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={disabled}
            rows={1}
            autoFocus={typeof window !== 'undefined' && !('ontouchstart' in window)}
            onFocus={() => {
              if (typeof window !== 'undefined') {
                setTimeout(() => {
                  window.scrollTo(0, 0);
                }, 80);
              }
            }}
            className="w-full px-3 py-2.5 bg-transparent resize-none outline-none text-[15px] leading-relaxed font-sans text-transparent caret-[#E6E4DD] select-text"
            placeholder={pendingImage ? '添加密图附言...' : ''}
          />
        </div>

        {/* Action Buttons: Image + Peek + Send */}
        <div className="flex items-center gap-1 pb-1 shrink-0">
          {/* Pick Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSendingImage}
            className={`p-2 rounded-[4px] transition-all cursor-pointer ${
              pendingImage
                ? 'text-[#E6E4DD] bg-[#9E2A2B]/25 border border-[#9E2A2B]/40'
                : 'text-[#6E737B] hover:text-[#E6E4DD] hover:bg-[rgba(230,228,221,0.06)]'
            }`}
            title="选择密印图片或粘贴截图"
          >
            <ImageIcon className="w-4 h-4" strokeWidth={1.8} />
          </button>

          {/* Peek Text Button: Click to show for 3 seconds */}
          {text.length > 0 && (
            <button
              type="button"
              onClick={handleTogglePeek}
              className="relative p-2 rounded-[4px] text-[#6E737B] hover:text-[#E6E4DD] hover:bg-[rgba(230,228,221,0.06)] transition-all cursor-pointer"
              title={isPeeking ? '点击提前隐匿' : '点击阅览文稿 3 秒'}
            >
              {isPeeking ? (
                <EyeOff className="w-4 h-4 text-[#d15c5c]" strokeWidth={1.5} />
              ) : (
                <Eye className="w-4 h-4" strokeWidth={1.5} />
              )}
              {isPeeking && (
                <span className="absolute bottom-0.5 left-1 right-1 h-[1.5px] bg-[#9E2A2B] rounded-full animate-countdown-3s pointer-events-none" />
              )}
            </button>
          )}

          {/* Send Button (朱砂方印微圆角) */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`p-2.5 rounded-[4px] transition-all duration-200 flex items-center justify-center ${
              canSend
                ? 'bg-[#9E2A2B] hover:bg-[#B83B2B] text-[#E6E4DD] border border-[rgba(184,59,43,0.5)] shadow-[0_2px_10px_rgba(158,42,43,0.3)] active:scale-95 cursor-pointer'
                : 'text-[#6E737B]/40 border border-transparent cursor-not-allowed'
            }`}
          >
            {isSendingImage ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#E6E4DD]" />
            ) : (
              <ArrowUp className="w-4 h-4" strokeWidth={2.2} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
