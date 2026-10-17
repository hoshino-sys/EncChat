import React, { useState } from 'react';
import { Lock, ArrowRight, Eye, EyeOff, X } from 'lucide-react';

interface AfkUnlockModalProps {
  onUnlock: () => void;
  onClose: () => void;
}

const AFK_SECRET = 'gslwin129';

export const AfkUnlockModal: React.FC<AfkUnlockModalProps> = ({ onUnlock, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === AFK_SECRET) {
      setError('');
      onUnlock();
    } else {
      setError('密符不符，无法解除');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] bg-[#0A0B0D]/85 backdrop-blur-xl">
      <div className="w-full max-w-xs rounded-[8px] bg-[#141619]/95 p-6 border border-[rgba(230,228,221,0.08)] shadow-[0_24px_70px_rgba(0,0,0,0.9)] animate-fade-in relative">
        {/* Close icon */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-[4px] text-[#6E737B] hover:text-[#E6E4DD] hover:bg-[rgba(230,228,221,0.06)] transition-all cursor-pointer"
        >
          <X className="w-4 h-4" strokeWidth={1.8} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center pb-4 pt-2">
          <div className="w-10 h-10 rounded-[4px] bg-[#0A0B0D]/60 border border-[rgba(230,228,221,0.1)] flex items-center justify-center mb-3 shadow-md">
            <Lock className="w-5 h-5 text-[#E6E4DD]" strokeWidth={1.8} />
          </div>
          <h3 className="font-serif text-base text-[#E6E4DD] font-medium tracking-[0.2em]">
            解除暂离
          </h3>
          <p className="font-sans text-xs text-[#6E737B] mt-1 tracking-wide">
            请输入暂离密符以恢复快捷查阅
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          {error && (
            <div className="p-2.5 rounded-[4px] bg-[#9E2A2B]/15 border border-[#9E2A2B]/35 text-[#d15c5c] text-xs font-sans text-center">
              {error}
            </div>
          )}

          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="输入密符"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-[4px] bg-[#0A0B0D]/60 border border-[rgba(230,228,221,0.1)] focus:border-[rgba(230,228,221,0.25)] focus:outline-none text-sm text-[#E6E4DD] font-sans placeholder:text-[#6E737B]/50 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6E737B] hover:text-[#E6E4DD] cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-[4px] bg-[#9E2A2B] hover:bg-[#B83B2B] text-[#E6E4DD] font-serif font-medium text-sm border border-[rgba(184,59,43,0.5)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_10px_rgba(158,42,43,0.3)] active:scale-[0.98]"
          >
            <span className="tracking-[0.2em]">解除锁定</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
};
