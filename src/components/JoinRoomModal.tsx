import React, { useState } from 'react';
import { Shield, Key, Hash, User, Sparkles, ArrowRight, Lock, Network } from 'lucide-react';
import { RoomSession } from '../types/chat';

interface JoinRoomModalProps {
  onJoin: (session: RoomSession) => void;
  defaultSession?: RoomSession | null;
}

// Generate random friendly room name
function generateRandomRoom(): string {
  const words = ['cipher', 'shadow', 'phantom', 'matrix', 'stealth', 'nebula', 'apex', 'vortex'];
  const num = Math.floor(100 + Math.random() * 900);
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}-${num}`;
}

// Generate random high-entropy key
function generateRandomKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let res = '';
  for (let i = 0; i < 16; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ onJoin, defaultSession }) => {
  const [roomId, setRoomId] = useState(defaultSession?.roomId || '');
  const [roomKey, setRoomKey] = useState(defaultSession?.roomKey || '');
  const [userName, setUserName] = useState(
    defaultSession?.userName || `特工-${Math.floor(100 + Math.random() * 900)}`
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
      setError('请输入或生成房间号');
      return;
    }
    if (!cleanKey) {
      setError('请输入加密密钥（密码），对方需输入相同密钥方能解密');
      return;
    }
    if (!cleanName) {
      setError('请输入您的房间昵称');
      return;
    }

    const cleanWs = customWsUrl.trim();
    if (cleanWs) {
      localStorage.setItem('encchat_custom_ws_url', cleanWs);
    } else {
      localStorage.removeItem('encchat_custom_ws_url');
    }

    const userId = defaultSession?.userId || `user_${Math.random().toString(36).substring(2, 9)}`;

    onJoin({
      roomId: cleanRoom,
      roomKey: cleanKey,
      userId,
      userName: cleanName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07080c]/90 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-3xl bg-[#111420]/95 border border-[#23293e] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Modal Top Header */}
        <div className="relative p-6 pb-4 border-b border-[#1f2538] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
                EncChat
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  E2EE
                </span>
              </h2>
              <p className="text-xs text-slate-400">端到端加密 · 打字1s变星号 · 防窥查看</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-all border border-slate-700/60"
            title="一键随机生成房间号与高强密钥"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>随机生成</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          {/* Nickname Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                自定义房间内昵称
              </span>
              <span className="text-[10px] text-slate-400 font-mono">其他人可见的代号</span>
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="例如: 幽灵、0xShadow、Alice"
              maxLength={24}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090b12] border border-[#23293e] focus:border-blue-500 focus:outline-none text-sm text-slate-100 font-sans transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Room ID Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                房间号 (Room ID)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">双方输入相同房间号</span>
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="例如: secret-room-101"
              maxLength={32}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090b12] border border-[#23293e] focus:border-blue-500 focus:outline-none text-sm text-slate-100 font-mono transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Room Key Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                加密密钥 / 房间密码 (E2EE Key)
              </span>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-mono"
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={roomKey}
                onChange={(e) => setRoomKey(e.target.value)}
                placeholder="双方输入相同密钥用于端到端解密"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090b12] border border-[#23293e] focus:border-blue-500 focus:outline-none text-sm text-slate-100 font-mono transition-all placeholder:text-slate-600 pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Advanced Relay Settings (Collapsible) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 font-mono transition-colors"
            >
              <Network className="w-3.5 h-3.5 text-blue-400" />
              <span>{showAdvanced ? '收起高级网络设置' : '高级网络设置 (可选自定义中继地址)'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-2 p-3 rounded-xl bg-[#090b12] border border-[#23293e] space-y-1.5 animate-fade-in">
                <label className="block text-[11px] text-slate-400">
                  WebSocket 中继服务器地址
                </label>
                <input
                  type="text"
                  value={customWsUrl}
                  onChange={(e) => setCustomWsUrl(e.target.value)}
                  placeholder="留空默认连接同源 /ws 或 Worker"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#111420] border border-[#23293e] focus:border-blue-500 focus:outline-none text-xs text-slate-200 font-mono placeholder:text-slate-600"
                />
                <p className="text-[10px] text-slate-500 leading-normal">
                  例如: <code className="text-slate-400">wss://encchat-relay.xxx.workers.dev/ws</code>。若部署在 Cloudflare Pages 且已配置路由，留空即可。
                </p>
              </div>
            )}
          </div>

          {/* Persistent Room Hint */}
          <div className="p-3 rounded-xl bg-[#0b0e17] border border-[#1d2335] text-[11px] text-slate-400 leading-relaxed">
            <span className="text-emerald-400 font-medium">💡 长期驻留特性：</span>
            进入房间后将保持常驻开启，刷新或重开网页自动重连，直至您主动点击退出房间。
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] cursor-pointer"
          >
            <span>开启 / 进入加密房间</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
