import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, Eye, EyeOff } from 'lucide-react';
import { generateMaskedRunes, getCharCount } from '../utils/maskCipher';

interface StealthInputProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export const StealthInput: React.FC<StealthInputProps> = ({ onSendMessage, disabled }) => {
  const [text, setText] = useState('');
  const [isMasked, setIsMasked] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const maskTimerRef = useRef<number | null>(null);
  const isComposingRef = useRef(false);

  // Sync scroll between textarea and overlay
  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Schedule auto-masking after 1s of typing inactivity
  const scheduleMasking = useCallback(() => {
    if (maskTimerRef.current) {
      clearTimeout(maskTimerRef.current);
    }

    maskTimerRef.current = window.setTimeout(() => {
      setIsMasked(true);
    }, 1000);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    if (val.length === 0) {
      setIsMasked(false);
      if (maskTimerRef.current) clearTimeout(maskTimerRef.current);
      return;
    }

    // Unmask immediately while active typing
    setIsMasked(false);

    if (!isComposingRef.current) {
      scheduleMasking();
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
    setIsMasked(false);
    if (maskTimerRef.current) clearTimeout(maskTimerRef.current);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false;
    const val = (e.target as HTMLTextAreaElement).value;
    setText(val);
    scheduleMasking();
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setText('');
    setIsMasked(false);
    if (maskTimerRef.current) {
      clearTimeout(maskTimerRef.current);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Reset timer on any key press
    setIsMasked(false);
    scheduleMasking();

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
    };
  }, []);

  // Compute visual displayed text
  const displayedContent = (() => {
    if (!text) return null;
    if (isPeeking) {
      return <span className="text-[#ffffff] font-serif">{text}</span>;
    }

    if (isMasked) {
      // 1s elapsed: Hide text completely behind mysterious 1:1 runes
      const runes = generateMaskedRunes(getCharCount(text), 'input_draft');
      return (
        <span className="text-[#a3abb8] font-serif text-[15px] tracking-[0.25em] select-none transition-all duration-300">
          {runes}
        </span>
      );
    }

    // Active typing (< 1s): Display visible plaintext
    return <span className="text-[#ffffff] font-serif transition-all duration-200">{text}</span>;
  })();

  return (
    <div className="w-full relative select-none">
      {/* High-Contrast White Frosted Glass Input Capsule */}
      <div className="relative flex items-end gap-2 p-1.5 rounded-2xl white-glass-input transition-all duration-200 focus-within:border-white/50 focus-within:bg-white/[0.12]">
        {/* Dual Layer Container */}
        <div className="relative flex-1 min-h-[44px] max-h-[130px] flex items-center overflow-hidden">
          {/* Visual Overlay Layer (Masked runes or clear text) */}
          <div
            ref={overlayRef}
            aria-hidden="true"
            className="absolute inset-0 px-3.5 py-2.5 pointer-events-none text-[15px] leading-relaxed whitespace-pre-wrap break-words overflow-y-auto select-none"
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
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={disabled}
            rows={1}
            autoFocus
            className="w-full px-3.5 py-2.5 bg-transparent resize-none outline-none text-[15px] leading-relaxed font-serif text-transparent caret-[#ffffff] select-text"
            placeholder=""
          />
        </div>

        {/* Action Buttons: Peek + Send */}
        <div className="flex items-center gap-1 pb-1 shrink-0">
          {text.length > 0 && (
            <button
              type="button"
              onMouseDown={() => setIsPeeking(true)}
              onMouseUp={() => setIsPeeking(false)}
              onMouseLeave={() => setIsPeeking(false)}
              onTouchStart={() => setIsPeeking(true)}
              onTouchEnd={() => setIsPeeking(false)}
              onTouchCancel={() => setIsPeeking(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
              title="按住速览已输入文稿"
            >
              {isPeeking ? <EyeOff className="w-4 h-4 text-white" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
            </button>
          )}

          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
              text.trim() && !disabled
                ? 'bg-white text-[#0f1117] hover:bg-[#fafafa] shadow-[0_2px_16px_rgba(255,255,255,0.2)] active:scale-95'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
};
