import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Eye, EyeOff } from 'lucide-react';

interface StealthInputProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export const StealthInput: React.FC<StealthInputProps> = ({ onSendMessage, disabled }) => {
  const [text, setText] = useState('');
  const [maskedIndex, setMaskedIndex] = useState(0);
  const [isPeeking, setIsPeeking] = useState(false);
  const [isTypingActive, setIsTypingActive] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const maskTimerRef = useRef<number | null>(null);
  const isComposingRef = useRef(false);

  // Sync scroll positions between native textarea and visual overlay
  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const scheduleMasking = useCallback((currentLength: number) => {
    if (maskTimerRef.current) {
      clearTimeout(maskTimerRef.current);
    }
    setIsTypingActive(true);

    maskTimerRef.current = setTimeout(() => {
      // 1s after user stops typing: mask all preceding characters to *
      setMaskedIndex(currentLength);
      setIsTypingActive(false);
    }, 1000);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const prevLength = text.length;
    setText(val);

    if (val.length === 0) {
      setMaskedIndex(0);
      setIsTypingActive(false);
      if (maskTimerRef.current) clearTimeout(maskTimerRef.current);
      return;
    }

    // If text was shortened (backspace / delete)
    if (val.length < prevLength) {
      setMaskedIndex((prev) => Math.min(prev, val.length));
    }

    // Only schedule 1s masking if not currently in Chinese IME composition
    if (!isComposingRef.current) {
      scheduleMasking(val.length);
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
    setIsTypingActive(true);
    if (maskTimerRef.current) clearTimeout(maskTimerRef.current);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false;
    const val = (e.target as HTMLTextAreaElement).value;
    setText(val);
    scheduleMasking(val.length);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setText('');
    setMaskedIndex(0);
    setIsTypingActive(false);
    if (maskTimerRef.current) {
      clearTimeout(maskTimerRef.current);
    }

    // Reset textarea height if expanded
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If user is choosing candidate words in Chinese IME, do not trigger send
    if (isComposingRef.current || e.nativeEvent.isComposing) {
      return;
    }

    // Enter without Shift -> Send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea height as content expands
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 46), 140);
      textareaRef.current.style.height = `${newHeight}px`;
      if (overlayRef.current) {
        overlayRef.current.style.height = `${newHeight}px`;
      }
    }
  }, [text]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (maskTimerRef.current) clearTimeout(maskTimerRef.current);
    };
  }, []);

  // Compute visual displayed text
  const displayedContent = (() => {
    if (!text) return null;
    if (isPeeking) return text; // Temporarily reveal actual text when peeking

    const validMaskCount = Math.min(maskedIndex, text.length);
    const maskedPart = '*'.repeat(validMaskCount);
    const visiblePart = text.slice(validMaskCount);

    return (
      <>
        <span className="text-slate-300 font-mono tracking-widest">{maskedPart}</span>
        <span className="text-blue-300 font-mono">{visiblePart}</span>
      </>
    );
  })();

  const isAllMasked = text.length > 0 && maskedIndex >= text.length && !isTypingActive && !isPeeking;

  return (
    <div className="w-full relative flex flex-col gap-1.5 select-none">
      {/* Privacy Status & Typing Bar */}
      <div className="flex items-center justify-between px-2 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          {isAllMasked ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              防窥保护已生效 (已打星)
            </span>
          ) : isTypingActive ? (
            <span className="inline-flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              正在输入 · 1s 后自动打星
            </span>
          ) : (
            <span className="text-slate-400">端到端加密通道已就绪</span>
          )}
        </div>

        {/* Windows / Mobile Hints */}
        <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400">
          <span>Enter 发送</span>
          <span>·</span>
          <span>Shift+Enter 换行</span>
        </div>
      </div>

      {/* Input Outer Box */}
      <div className="relative flex items-end gap-2 p-1.5 rounded-2xl bg-[#111420] border border-[#23293e] focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all shadow-lg">
        {/* Dual Layer Container */}
        <div className="relative flex-1 min-h-[46px] max-h-[140px] flex items-center overflow-hidden">
          {/* Visual Overlay Layer (Renders masked * and visible text) */}
          <div
            ref={overlayRef}
            aria-hidden="true"
            className="absolute inset-0 px-3 py-2.5 pointer-events-none text-[15px] leading-relaxed whitespace-pre-wrap break-words overflow-y-auto select-none"
          >
            {text ? (
              displayedContent
            ) : (
              <span className="text-slate-400 select-none text-sm font-sans">
                输入加密消息...（打字 1s 后自动变星号）
              </span>
            )}
          </div>

          {/* Real Native Textarea (Maintains real characters, IME composition, caret, selections) */}
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
            className={`w-full px-3 py-2.5 bg-transparent resize-none outline-none text-[15px] leading-relaxed font-mono ${
              isPeeking ? 'text-slate-100' : 'text-transparent'
            } caret-blue-400 select-text`}
            placeholder=""
          />
        </div>

        {/* Action Buttons: Peek Eye + Send */}
        <div className="flex items-center gap-1 pb-1 shrink-0">
          {/* Peek button: hold to inspect own typed message */}
          {text.length > 0 && (
            <button
              type="button"
              onMouseDown={() => setIsPeeking(true)}
              onMouseUp={() => setIsPeeking(false)}
              onMouseLeave={() => setIsPeeking(false)}
              onTouchStart={() => setIsPeeking(true)}
              onTouchEnd={() => setIsPeeking(false)}
              onTouchCancel={() => setIsPeeking(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 active:scale-95 transition-all"
              title="按住查看自己输入的内容"
            >
              {isPeeking ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
            </button>
          )}

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
              text.trim() && !disabled
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.35)] active:scale-95'
                : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
            }`}
            title="发送消息"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
