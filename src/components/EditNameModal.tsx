import React, { useState } from 'react';
import { User, X, Check } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-[#121522] border border-[#23293e] shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <User className="w-4 h-4 text-blue-400" />
            <span>修改房间内昵称</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">新的昵称 / 代号</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              autoFocus
              className="w-full px-3.5 py-2 rounded-xl bg-[#090b12] border border-[#23293e] focus:border-blue-500 focus:outline-none text-sm text-slate-100 font-sans"
              placeholder="输入新代号"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>保存修改</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
