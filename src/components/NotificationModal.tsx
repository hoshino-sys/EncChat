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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0B0D]/85 backdrop-blur-xl select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-[8px] bg-[#141619]/95 border border-[rgba(230,228,221,0.08)] shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Banner */}
        <div className="relative px-6 pt-5 pb-4 border-b border-[rgba(230,228,221,0.08)] bg-[#0A0B0D]/40 flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-[4px] bg-[#9E2A2B]/15 border border-[#9E2A2B]/40 flex items-center justify-center shadow-[0_2px_10px_rgba(158,42,43,0.2)] shrink-0">
              <Bell className="w-5 h-5 text-[#E6E4DD]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-base font-medium text-[#E6E4DD] tracking-[0.15em]">
                  信函通知 · 状态诊断
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-[3px] font-sans bg-[#9E2A2B]/15 text-[#d15c5c] border border-[#9E2A2B]/30">
                  横幅自检
                </span>
              </div>
              <div className="text-xs text-[#6E737B] font-sans mt-0.5">
                实时检测系统通知授权与悬浮弹窗权限
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-[#6E737B] hover:text-[#E6E4DD] hover:bg-[rgba(230,228,221,0.06)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4">
          {/* Status Diagnostic Card */}
          <div className="bg-[#0A0B0D]/50 rounded-[6px] p-4 border border-[rgba(230,228,221,0.08)] space-y-3">
            <div className="text-xs text-[#6E737B] font-sans font-medium tracking-wider flex items-center justify-between">
              <span>系统授权状态</span>
              <button
                type="button"
                onClick={refreshStatus}
                className="text-[11px] text-[#4E7A6B] hover:text-[#6db39e] hover:underline cursor-pointer font-sans"
              >
                刷新检测
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Overall Notification Status */}
              <div className="flex items-center justify-between text-xs py-2 px-3 rounded-[4px] bg-[#141619]/80 border border-[rgba(230,228,221,0.06)] font-sans">
                <span className="text-[#E6E4DD] flex items-center space-x-2">
                  <Smartphone className="w-3.5 h-3.5 text-[#6E737B]" />
                  <span>系统通知总开关</span>
                </span>
                {loading ? (
                  <span className="text-[#6E737B] font-sans text-[11px]">检测中...</span>
                ) : status?.enabled ? (
                  <span className="flex items-center space-x-1 text-[#4E7A6B] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>已允许</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-[#9E2A2B] font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>未开启 / 已禁用</span>
                  </span>
                )}
              </div>

              {/* Heads-up Banner Status */}
              <div className="flex items-center justify-between text-xs py-2 px-3 rounded-[4px] bg-[#141619]/80 border border-[rgba(230,228,221,0.06)] font-sans">
                <span className="text-[#E6E4DD] flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#4E7A6B]" />
                  <span>悬浮顶栏横幅（Heads-up）</span>
                </span>
                {loading ? (
                  <span className="text-[#6E737B] font-sans text-[11px]">检测中...</span>
                ) : status?.canHeadsUp ? (
                  <span className="flex items-center space-x-1 text-[#4E7A6B] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>最高优先级</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-[#b8924b] font-medium">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>需系统开启悬浮</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Test notification feedback result */}
          {testResult && (
            <div className="p-3 rounded-[4px] bg-[#4E7A6B]/15 border border-[#4E7A6B]/30 text-[#6db39e] text-xs font-sans animate-fadeIn flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{testResult}</span>
            </div>
          )}

          {/* Practical Android Guidance */}
          <div className="p-3.5 rounded-[6px] bg-[#0A0B0D]/30 border border-[rgba(230,228,221,0.06)] text-[11px] font-sans text-[#6E737B] leading-relaxed space-y-1.5">
            <div className="text-[#E6E4DD] font-medium flex items-center space-x-1.5">
              <span className="text-[#9E2A2B]">✦</span>
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
        <div className="px-6 py-4 border-t border-[rgba(230,228,221,0.08)] bg-[#0A0B0D]/40 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={testing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-[4px] text-xs font-sans font-medium text-[#E6E4DD] bg-[#141619] hover:bg-[#1e2227] border border-[rgba(230,228,221,0.08)] active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-[#6E737B]" />
            <span>{testing ? '发送中...' : '发送测试横幅通知'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSettings}
            className="w-full sm:w-auto px-4 py-2.5 rounded-[4px] text-xs font-serif font-medium text-[#E6E4DD] bg-[#9E2A2B] hover:bg-[#B83B2B] border border-[rgba(184,59,43,0.5)] shadow-[0_2px_10px_rgba(158,42,43,0.3)] active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer tracking-wider"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>前往系统通知设置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
