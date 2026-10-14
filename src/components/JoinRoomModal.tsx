import React, { useState } from 'react';
import { ArrowRight, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { RoomSession } from '../types/chat';

interface JoinRoomModalProps {
  onJoin: (session: RoomSession) => void;
  defaultSession?: RoomSession | null;
}

// Generate random poetic room names
function generateRandomRoom(): string {
  const names = ['松雪', '寒江', '青云', '听雨', '枕石', '拂风', '素问', '临渊'];
  const num = Math.floor(100 + Math.random() * 900);
  const n = names[Math.floor(Math.random() * names.length)];
  return `${n}-${num}`;
}

// Generate random key
function generateRandomKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let res = '';
  for (let i = 0; i < 14; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ onJoin, defaultSession }) => {
  const [roomId, setRoomId] = useState(defaultSession?.roomId || '');
  const [roomKey, setRoomKey] = useState(defaultSession?.roomKey || '');
  const [userName, setUserName] = useState(
    defaultSession?.userName || `客-${Math.floor(100 + Math.random() * 900)}`
  );
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customWsUrl, setCustomWsUrl] = useState(() => {
    return localStorage.getItem('encchat_custom_ws_url') || '';
  });
  const [error, setError] = useState('');

  const handleGenerate = () => {
    setRoomId(generateRandomRoom());
    setRoomKey(generateRandomKey());
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoom = roomId.trim();
    const cleanKey = roomKey.trim();
    const cleanName = userName.trim();

    if (!cleanRoom) {
      setError('请填写斋号');
      return;
    }
    if (!cleanKey) {
      setError('请填写密押');
      return;
    }
    if (!cleanName) {
      setError('请填写代号');
      return;
    }

    const cleanWs = customWsUrl.trim();
    if (cleanWs) {
      localStorage.setItem('encchat_custom_ws_url', cleanWs);
    } else {
      localStorage.removeItem('encchat_custom_ws_url');
    }

    const userId = defaultSession?.userId || `u_${Math.random().toString(36).substring(2, 9)}`;

    onJoin({
      roomId: cleanRoom,
      roomKey: cleanKey,
      userId,
      userName: cleanName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-2xl">
      <div className="w-full max-w-sm rounded-3xl ink-panel shadow-[0_20px_70px_rgba(0,0,0,0.8)] border border-white/[0.08] overflow-hidden p-6 md:p-7">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md seal-bg seal-red flex items-center justify-center font-serif text-xs font-bold">
              墨
            </span>
            <span className="font-serif text-lg tracking-widest text-[#edeae1]">
              墨隐
            </span>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-xs font-serif text-[#9da3b2] hover:text-[#eae6db] transition-all"
            title="生成斋号与密押"
          >
            <RefreshCw className="w-3 h-3 opacity-60" strokeWidth={1.5} />
            <span>随机</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs font-serif text-center">
              {error}
            </div>
          )}

          {/* Nickname */}
          <div>
            <label className="block text-xs font-serif text-[#8f96a5] mb-1.5">
              代号
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="例: 青衫、云客"
              maxLength={20}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.07] focus:border-white/20 focus:outline-none text-sm text-[#eeeae2] font-serif placeholder:text-slate-700 transition-all"
            />
          </div>

          {/* Room ID */}
          <div>
            <label className="block text-xs font-serif text-[#8f96a5] mb-1.5">
              斋号
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="例: 松雪-101"
              maxLength={32}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.07] focus:border-white/20 focus:outline-none text-sm text-[#eeeae2] font-serif placeholder:text-slate-700 transition-all"
            />
          </div>

          {/* Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-serif text-[#8f96a5]">
                密押
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-[#787f90] hover:text-[#a0a8bb] font-serif"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5 inline" strokeWidth={1.5} /> : <Eye className="w-3.5 h-3.5 inline" strokeWidth={1.5} />}
              </button>
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              value={roomKey}
              onChange={(e) => setRoomKey(e.target.value)}
              placeholder="两端相同的解印凭据"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.07] focus:border-white/20 focus:outline-none text-sm text-[#eeeae2] font-serif placeholder:text-slate-700 transition-all"
            />
          </div>

          {/* Optional Relay Config */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-[#636978] hover:text-[#8890a2] font-serif transition-colors"
            >
              {showAdvanced ? '收起中继设置' : '自选中继'}
            </button>

            {showAdvanced && (
              <div className="mt-2 p-3 rounded-xl bg-black/30 border border-white/[0.05] animate-fade-in space-y-1">
                <input
                  type="text"
                  value={customWsUrl}
                  onChange={(e) => setCustomWsUrl(e.target.value)}
                  placeholder="留空即默认同源直连"
                  className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-white/[0.06] text-xs text-[#d8d3c5] font-serif placeholder:text-slate-700 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-3 py-3 px-4 rounded-xl bg-[#ede9df] hover:bg-white text-[#111317] font-serif font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_16px_rgba(255,255,255,0.12)] active:scale-[0.99]"
          >
            <span className="tracking-widest">入室</span>
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
};
