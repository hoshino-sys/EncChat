import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, ExternalLink, Send, X, ShieldAlert, Sparkles, Smartphone } from 'lucide-react';
import { notificationService, NotificationStatus } from '../services/notification';

interface NotificationModalProps {
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const s = await notificationService.checkStatus();
      setStatus(s);
    } catch (e) {
      console.warn('Failed to query notification status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleTestNotification = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await notificationService.triggerTestNotification();
      if (ok) {
        setTestResult('测试信函已发送，请留意屏幕顶端横幅或下拉通知栏！');
      } else {
        setTestResult('发送被系统拦截，请检查通知授权是否开启。');
      }
      // Re-verify status
      await refreshStatus();
    } catch (e: any) {
      setTestResult('测试失败: ' + (e?.message || e));
    } finally {
      setTesting(false);
    }
  };

  const handleOpenSettings = async () => {
    await notificationService.openSettings();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-[#16181f] via-[#0f1117] to-[#0a0c10] border border-[#a83232]/40 shadow-[0_16px_48px_rgba(0,0,0,0.8),0_0_24px_rgba(168,50,50,0.15)] overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Banner */}
        <div className="relative px-6 pt-5 pb-4 border-b border-stone-800/80 bg-gradient-to-r from-[#211215]/80 via-[#181a22]/80 to-[#121622]/80 flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#a83232]/15 border border-[#a83232]/50 flex items-center justify-center shadow-[0_0_16px_rgba(168,50,50,0.3)] shrink-0">
              <Bell className="w-5 h-5 text-[#e5c158]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-base font-bold text-stone-100 tracking-wide">
                  信函通知 · 状态诊断
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-serif bg-[#a83232]/25 text-[#e05656] border border-[#a83232]/40">
                  横幅自检
                </span>
              </div>
              <div className="text-xs text-stone-400 font-serif mt-0.5">
                实时检测系统通知授权与悬浮弹窗权限
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4 font-serif">
          {/* Status Diagnostic Card */}
          <div className="bg-stone-900/60 rounded-xl p-4 border border-stone-800/80 space-y-3">
            <div className="text-xs text-stone-400 font-medium tracking-wider flex items-center justify-between">
              <span>系统授权状态</span>
              <button
                type="button"
                onClick={refreshStatus}
                className="text-[11px] text-[#e5c158] hover:underline cursor-pointer"
              >
                刷新检测
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Overall Notification Status */}
              <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-black/30 border border-stone-800/50">
                <span className="text-stone-300 flex items-center space-x-2">
                  <Smartphone className="w-3.5 h-3.5 text-stone-400" />
                  <span>系统通知总开关</span>
                </span>
                {loading ? (
                  <span className="text-stone-500 font-mono text-[11px]">检测中...</span>
                ) : status?.enabled ? (
                  <span className="flex items-center space-x-1 text-[#6dbb89] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>已允许</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-[#e05656] font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>未开启 / 已禁用</span>
                  </span>
                )}
              </div>

              {/* Heads-up Banner Status */}
              <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-black/30 border border-stone-800/50">
                <span className="text-stone-300 flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#e5c158]" />
                  <span>悬浮顶栏横幅（Heads-up）</span>
                </span>
                {loading ? (
                  <span className="text-stone-500 font-mono text-[11px]">检测中...</span>
                ) : status?.canHeadsUp ? (
                  <span className="flex items-center space-x-1 text-[#6dbb89] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>最高优先级</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-[#d6a75d] font-medium">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>需系统开启悬浮</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Test notification feedback result */}
          {testResult && (
            <div className="p-3 rounded-xl bg-[#6dbb89]/10 border border-[#6dbb89]/30 text-[#6dbb89] text-xs font-serif animate-fadeIn flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{testResult}</span>
            </div>
          )}

          {/* Practical Android Guidance */}
          <div className="p-3.5 rounded-xl bg-stone-900/40 border border-stone-800/60 text-[11px] text-stone-400 leading-relaxed space-y-1.5">
            <div className="text-stone-300 font-medium flex items-center space-x-1.5">
              <span className="text-[#a83232]">✦</span>
              <span>横幅弹窗关键设置指南</span>
            </div>
            <p>
              小米澎湃OS/MIUI、华为鸿蒙、OPPO、vivo 等安卓系统，默认会<strong>关闭</strong>第三方应用的「悬浮通知/横幅通知」。
            </p>
            <p>
              若收到消息时仅有声音或只进通知栏而无顶部弹窗，请点击下方<strong>【前往系统设置】</strong>，在通知管理中打开<strong>【悬浮通知】</strong>与<strong>【锁屏通知】</strong>即可！
            </p>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="px-6 py-4 border-t border-stone-800/80 bg-[#0c0e12]/60 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={testing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-serif font-bold text-stone-200 bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700/60 active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-[#e5c158]" />
            <span>{testing ? '发送中...' : '发送测试横幅通知'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSettings}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-serif font-bold text-white bg-gradient-to-r from-[#a83232] to-[#c24141] hover:from-[#b93838] hover:to-[#d14b4b] shadow-[0_4px_16px_rgba(168,50,50,0.35)] active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>前往系统通知设置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
