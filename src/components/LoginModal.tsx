import React, { useState, useEffect } from 'react';
import { ArrowRight, Eye, EyeOff, User } from 'lucide-react';
import { RoomSession } from '../types/chat';

interface LoginModalProps {
  onLogin: (session: RoomSession) => void;
  savedSession?: RoomSession | null;
}

const PRESET_USERS = [
  { name: '夜星' as const, role: 'admin' as const, roleLabel: '管理员' },
  { name: '小夜星' as const, role: 'user' as const, roleLabel: '普通用户' },
];

type PresetUserName = '夜星' | '小夜星';

async function hashPassword(password: string, username: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${username}::encchat_salt_v2::${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, savedSession }) => {
  const [selectedUser, setSelectedUser] = useState<PresetUserName>(
    savedSession?.userName || '夜星'
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasPasswordSet, setHasPasswordSet] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check account status whenever selected user changes
  useEffect(() => {
    let isCancelled = false;
    setError('');
    setPassword('');
    setConfirmPassword('');
    setIsLoading(true);

    async function checkStatus() {
      try {
        const res = await fetch(`/api/account-status?username=${encodeURIComponent(selectedUser)}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setHasPasswordSet(Boolean(data.hasPassword));
          }
        } else {
          // If 404 or not reachable (e.g. dev mode without proxy), check localStorage fallback
          const localKey = `encchat_pwd_set_${selectedUser}`;
          const isLocalSet = localStorage.getItem(localKey) === 'true';
          if (!isCancelled) {
            setHasPasswordSet(isLocalSet);
          }
        }
      } catch {
        // Fallback check
        const localKey = `encchat_pwd_set_${selectedUser}`;
        const isLocalSet = localStorage.getItem(localKey) === 'true';
        if (!isCancelled) {
          setHasPasswordSet(isLocalSet);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    checkStatus();

    return () => {
      isCancelled = true;
    };
  }, [selectedUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPwd = password.trim();
    if (!cleanPwd) {
      setError('请输入密印');
      return;
    }

    const isFirstTime = hasPasswordSet === false;

    if (isFirstTime) {
      const cleanConfirm = confirmPassword.trim();
      if (!cleanConfirm) {
        setError('请确认密印');
        return;
      }
      if (cleanPwd !== cleanConfirm) {
        setError('两次输入的密印不一致');
        return;
      }
      if (cleanPwd.length < 4) {
        setError('密印长度至少需4位');
        return;
      }
    }

    setIsLoading(true);

    try {
      const pwdHash = await hashPassword(cleanPwd, selectedUser);

      let authSuccess = false;
      let serverError = '';

      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: selectedUser,
            passwordHash: pwdHash,
            isFirstTime,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          authSuccess = true;
          // Mark locally as well
          localStorage.setItem(`encchat_pwd_set_${selectedUser}`, 'true');
        } else {
          serverError = data.error || '验证失败';
          if (data.needSetup) {
            setHasPasswordSet(false);
          }
        }
      } catch {
        // If API route failed (e.g. offline fallback)
        const localKey = `encchat_local_pwd_${selectedUser}`;
        const existingLocal = localStorage.getItem(localKey);

        if (isFirstTime) {
          if (existingLocal) {
            serverError = '该席位密印已固化，无法更改';
          } else {
            localStorage.setItem(localKey, pwdHash);
            localStorage.setItem(`encchat_pwd_set_${selectedUser}`, 'true');
            authSuccess = true;
          }
        } else {
          if (existingLocal === pwdHash) {
            authSuccess = true;
          } else {
            serverError = '密印有误，无法入席';
          }
        }
      }

      if (authSuccess) {
        const role = selectedUser === '夜星' ? 'admin' : 'user';
        const userId = savedSession?.userId || `u_${Math.random().toString(36).substring(2, 9)}`;

        onLogin({
          roomId: '墨隐阁',
          roomKey: 'nightstar-sanctuary-e2ee-key-v1',
          userId,
          userName: selectedUser,
          role,
          authHash: pwdHash,
        });
      } else {
        setError(serverError || '密印验证失败');
      }
    } catch (err: any) {
      setError('入席验证异常: ' + (err.message || '未知错误'));
    } finally {
      setIsLoading(false);
    }
  };

  const isFirstTime = hasPasswordSet === false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
      <div className="w-full max-w-sm rounded-3xl white-glass border border-white/20 shadow-[0_24px_70px_rgba(0,0,0,0.85)] overflow-hidden p-6 md:p-8 animate-fade-in select-none">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg seal-bg seal-red flex items-center justify-center font-serif text-sm font-bold shadow-[0_2px_12px_rgba(171,56,56,0.35)]">
              墨
            </span>
            <span className="font-serif text-xl tracking-widest text-[#ffffff] font-medium">
              墨隐
            </span>
          </div>
          <p className="font-serif text-xs text-[#a0a6b5] tracking-wider">
            仅限受权席位验证入席 · 阅后无痕
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs font-serif text-center tracking-wide animate-fade-in">
              {error}
            </div>
          )}

          {/* Account Selection */}
          <div>
            <label className="block text-xs font-serif text-[#9da3b2] mb-2 tracking-wider">
              选择入席身份
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {PRESET_USERS.map((user) => {
                const isSelected = selectedUser === user.name;
                return (
                  <button
                    key={user.name}
                    type="button"
                    onClick={() => setSelectedUser(user.name)}
                    className={`py-3 px-3 rounded-2xl font-serif text-xs transition-all duration-200 flex flex-col items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-white/[0.14] border border-white/40 shadow-[0_4px_20px_rgba(255,255,255,0.12)] text-[#ffffff]'
                        : 'bg-white/[0.04] border border-white/10 text-[#8e95a5] hover:text-[#d3d8e5] hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" strokeWidth={1.8} />
                      <span className={`font-medium text-sm ${user.name === '夜星' ? 'text-name-gold' : 'text-name-red'}`}>
                        {user.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-serif ${
                        user.name === '夜星'
                          ? 'seal-bg text-[#e5c158] border border-[#e5c158]/30 font-medium'
                          : 'bg-[#e05353]/10 text-[#e05353] border border-[#e05353]/30 font-medium'
                      }`}
                    >
                      {user.roleLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* First Time Notice */}
          {isFirstTime && (
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200/90 text-[11px] font-serif tracking-wider text-center">
              此席位初次入室，请自定密印。一经设定将永久固化，不可更改。
            </div>
          )}

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-serif text-[#9da3b2] tracking-wider">
                {isFirstTime ? '设定密印' : '入席密印'}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#8e95a5] hover:text-[#d0d6e5] font-serif"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} />
                ) : (
                  <Eye className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} />
                )}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入席位密印"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 focus:border-white/50 focus:outline-none text-sm text-[#ffffff] font-serif placeholder:text-slate-600 transition-all"
            />
          </div>

          {/* Confirm Password (ONLY shown on first time!) */}
          {isFirstTime && (
            <div className="animate-fade-in">
              <label className="block text-xs font-serif text-[#9da3b2] mb-1.5 tracking-wider">
                确认密印
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次确认席位密印"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 focus:border-white/50 focus:outline-none text-sm text-[#ffffff] font-serif placeholder:text-slate-600 transition-all"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className={`w-full mt-4 py-3 px-4 rounded-xl font-serif font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.18)] ${
              password.trim() && !isLoading
                ? 'bg-white hover:bg-[#f2f2f2] text-[#0f1117] active:scale-[0.99]'
                : 'bg-white/20 text-[#606573] cursor-not-allowed'
            }`}
          >
            <span className="tracking-widest">
              {isLoading ? '验证中...' : isFirstTime ? '固化密印并入室' : '入席'}
            </span>
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
};
