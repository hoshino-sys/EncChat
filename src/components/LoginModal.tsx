import React, { useState, useEffect } from 'react';
import { ArrowRight, Eye, EyeOff, User } from 'lucide-react';
import { RoomSession } from '../types/chat';

interface LoginModalProps {
  onLogin: (session: RoomSession) => void;
  savedSession?: RoomSession | null;
}

import { sha256 } from 'js-sha256';
import { getApiUrl } from '../services/apiConfig';

const PRESET_USERS = [
  { name: '夜星' as const, role: 'admin' as const, roleLabel: '管理员' },
  { name: '小夜星' as const, role: 'user' as const, roleLabel: '普通用户' },
];

type PresetUserName = '夜星' | '小夜星';

async function hashPassword(password: string, username: string): Promise<string> {
  const payload = `${username}::encchat_salt_v2::${password}`;
  // Try native crypto.subtle if available, otherwise use pure JS sha256 fallback
  if (typeof window !== 'undefined' && window.crypto?.subtle?.digest) {
    try {
      const enc = new TextEncoder();
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(payload));
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {}
  }
  return sha256(payload);
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
        const res = await fetch(getApiUrl(`/api/account-status?username=${encodeURIComponent(selectedUser)}`));
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
        const res = await fetch(getApiUrl('/api/auth'), {
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
        const userId = selectedUser === '夜星' ? 'user_yexing' : 'user_xiaoyexing';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] bg-[#0A0B0D]/85 backdrop-blur-xl">
      <div className="w-full max-w-sm rounded-[8px] bg-[#141619]/90 border border-[rgba(230,228,221,0.08)] backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden p-6 md:p-8 animate-fade-in select-none">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-[rgba(230,228,221,0.08)]">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="w-7 h-7 rounded-[4px] bg-[#9E2A2B] text-[#E6E4DD] border border-[rgba(184,59,43,0.5)] flex items-center justify-center font-serif text-sm font-bold shadow-[0_2px_10px_rgba(158,42,43,0.3)]">
              墨
            </span>
            <span className="font-serif text-xl tracking-[0.25em] text-[#E6E4DD] font-normal">
              墨隐
            </span>
          </div>
          <p className="font-sans text-xs text-[#6E737B] tracking-wider">
            仅限受权席位验证入席 · 阅后无痕
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-3 rounded-[4px] bg-[#9E2A2B]/15 border border-[#9E2A2B]/35 text-[#d15c5c] text-xs font-sans text-center tracking-wide animate-fade-in">
              {error}
            </div>
          )}

          {/* Account Selection */}
          <div>
            <label className="block text-xs font-sans text-[#6E737B] mb-2 tracking-wider">
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
                    className={`py-3 px-3 rounded-[4px] text-xs transition-all duration-200 flex flex-col items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e2227] border border-[rgba(230,228,221,0.22)] shadow-[0_4px_20px_rgba(0,0,0,0.5)] text-[#E6E4DD]'
                        : 'bg-[#0A0B0D]/50 border border-[rgba(230,228,221,0.06)] text-[#6E737B] hover:text-[#E6E4DD] hover:bg-[#141619]/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" strokeWidth={1.8} />
                      <span className={`font-serif font-medium text-sm tracking-wider ${user.name === '夜星' ? 'text-name-yexing' : 'text-name-xiaoyexing'}`}>
                        {user.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-[3px] font-sans ${
                        user.name === '夜星'
                          ? 'badge-admin'
                          : 'badge-user'
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
            <div className="p-2.5 rounded-[4px] bg-[#4E7A6B]/15 border border-[#4E7A6B]/30 text-[#6db39e] text-[11px] font-sans tracking-wide text-center">
              此席位初次入室，请自定密印。一经设定将永久固化，不可更改。
            </div>
          )}

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-sans text-[#6E737B] tracking-wider">
                {isFirstTime ? '设定密印' : '入席密印'}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#6E737B] hover:text-[#E6E4DD] font-sans transition-colors cursor-pointer"
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
              className="w-full px-3.5 py-2.5 rounded-[4px] bg-[#0A0B0D]/60 border border-[rgba(230,228,221,0.1)] focus:border-[rgba(230,228,221,0.25)] focus:outline-none text-sm text-[#E6E4DD] font-sans placeholder:text-[#6E737B]/50 transition-all"
            />
          </div>

          {/* Confirm Password (ONLY shown on first time!) */}
          {isFirstTime && (
            <div className="animate-fade-in">
              <label className="block text-xs font-sans text-[#6E737B] mb-1.5 tracking-wider">
                确认密印
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次确认席位密印"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 rounded-[4px] bg-[#0A0B0D]/60 border border-[rgba(230,228,221,0.1)] focus:border-[rgba(230,228,221,0.25)] focus:outline-none text-sm text-[#E6E4DD] font-sans placeholder:text-[#6E737B]/50 transition-all"
              />
            </div>
          )}

          {/* Submit Button (朱砂印章) */}
          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className={`w-full mt-4 py-3 px-4 rounded-[4px] font-serif font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              password.trim() && !isLoading
                ? 'bg-[#9E2A2B] hover:bg-[#B83B2B] text-[#E6E4DD] border border-[rgba(184,59,43,0.5)] shadow-[0_4px_16px_rgba(158,42,43,0.35)] active:scale-[0.99]'
                : 'bg-[#141619] border border-[rgba(230,228,221,0.06)] text-[#6E737B]/40 cursor-not-allowed'
            }`}
          >
            <span className="tracking-[0.25em]">
              {isLoading ? '验证中...' : isFirstTime ? '固化密印并入室' : '入席'}
            </span>
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
};
