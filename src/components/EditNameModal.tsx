import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface EditNameModalProps {
  currentName: string;
  onSave: (newName: string) => void;
  onClose: () => void;
}

export const EditNameModal: React.FC<EditNameModalProps> = ({ currentName, onSave, onClose }) => {
  const [name, setName] = useState(currentName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (clean) {
      onSave(clean);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-2xl animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl ink-panel border border-white/[0.08] shadow-[0_16px_50px_rgba(0,0,0,0.7)] p-6">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <span className="font-serif text-sm tracking-wider text-[#eeeae1]">
            改换名号
          </span>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-300 rounded-lg transition-all"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-serif text-[#8f96a5] mb-1.5">代号</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.07] focus:border-white/20 focus:outline-none text-sm text-[#eeeae2] font-serif transition-all"
              placeholder="输入新代号"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 text-xs font-serif transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2 rounded-xl bg-[#ede9df] hover:bg-white disabled:opacity-40 text-[#111317] text-xs font-serif transition-all flex items-center justify-center gap-1.5 font-medium"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2} />
              <span>保存</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
