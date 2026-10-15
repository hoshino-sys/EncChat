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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] bg-black/75 backdrop-blur-2xl">
      <div className="w-full max-w-xs rounded-3xl white-glass p-6 border border-white/25 shadow-[0_24px_70px_rgba(0,0,0,0.85)] animate-fade-in relative">
        {/* Close icon */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <X className="w-4 h-4" strokeWidth={1.8} />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center pb-4 pt-2">
          <div className="w-11 h-11 rounded-2xl bg-white/[0.08] border border-white/20 flex items-center justify-center mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <Lock className="w-5 h-5 text-[#f5f5f7]" strokeWidth={1.8} />
          </div>
          <h3 className="font-serif text-base text-[#ffffff] font-medium tracking-wider">
            解除暂离
          </h3>
          <p className="font-serif text-xs text-[#9aa1b1] mt-1 tracking-wide">
            请输入暂离密符以恢复快捷查阅
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs font-serif text-center">
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 focus:border-white/50 focus:outline-none text-sm text-[#ffffff] font-serif placeholder:text-slate-600 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
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
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#f2f2f2] text-[#0d0f14] font-serif font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(255,255,255,0.18)] active:scale-[0.98]"
          >
            <span className="tracking-widest">解除锁定</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
};
