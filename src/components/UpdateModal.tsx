import React, { useState } from 'react';
import { Sparkles, Download, X, CheckCircle2, Loader2 } from 'lucide-react';
import { VersionInfo, startDownloadAndInstall, CURRENT_VERSION } from '../services/updateChecker';

interface UpdateModalProps {
  versionInfo: VersionInfo;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ versionInfo, onClose }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      await startDownloadAndInstall(versionInfo.downloadUrl);
      setHasStarted(true);
    } catch (err) {
      console.warn('Update trigger failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const notesList = versionInfo.releaseNotes
    ? versionInfo.releaseNotes.split('\n').filter((line) => line.trim().length > 0)
    : ['性能优化与体验改进'];

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
        <div className="relative px-6 pt-6 pb-4 border-b border-[rgba(230,228,221,0.08)] bg-[#0A0B0D]/40 flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-[4px] bg-[#9E2A2B]/15 border border-[#9E2A2B]/40 flex items-center justify-center shadow-[0_2px_10px_rgba(158,42,43,0.2)] shrink-0">
              <Sparkles className="w-5 h-5 text-[#E6E4DD]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-base font-medium text-[#E6E4DD] tracking-[0.2em]">
                  墨隐 · 版本更新
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-[3px] font-sans bg-[#9E2A2B]/15 text-[#d15c5c] border border-[#9E2A2B]/30">
                  新版就绪
                </span>
              </div>
              <div className="text-xs text-[#6E737B] font-sans mt-1 flex items-center space-x-1.5">
                <span>v{CURRENT_VERSION}</span>
                <span className="text-[#9E2A2B]">➔</span>
                <span className="text-[#6db39e] font-medium">v{versionInfo.latestVersion}</span>
                {versionInfo.pubDate && (
                  <span className="text-[#6E737B]/70 text-[11px]">({versionInfo.pubDate})</span>
                )}
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

        {/* Release Notes Body */}
        <div className="px-6 py-5 max-h-[46vh] overflow-y-auto space-y-3 font-sans">
          <div className="text-xs text-[#6E737B] font-medium tracking-wider text-[11px]">
            更新要旨
          </div>
          <div className="space-y-2 bg-[#0A0B0D]/50 rounded-[6px] p-3.5 border border-[rgba(230,228,221,0.06)]">
            {notesList.map((item, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-[#E6E4DD] leading-relaxed">
                <span className="text-[#4E7A6B] text-[10px] mt-0.5 shrink-0">✦</span>
                <span className="break-words">{item}</span>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-[#6E737B]/70 leading-relaxed px-1">
            ※ 首次从测试版更新若遇系统提示「签名不一致」，需先卸载旧版后安装；此后所有新版均支持应用内一键无缝平滑覆盖升级。
          </div>

          {hasStarted && (
            <div className="flex items-center space-x-2 p-3 rounded-[4px] bg-[#4E7A6B]/15 border border-[#4E7A6B]/30 text-[#6db39e] text-xs animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>下载任务已启动，请留意通知栏进度；下载完成后将自动唤起系统安装。</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[rgba(230,228,221,0.08)] bg-[#0A0B0D]/40 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[4px] text-xs font-sans text-[#6E737B] hover:text-[#E6E4DD] hover:bg-[rgba(230,228,221,0.06)] transition-colors cursor-pointer"
          >
            稍后再说
          </button>

          <button
            type="button"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-5 py-2.5 rounded-[4px] text-xs font-serif font-medium text-[#E6E4DD] bg-[#9E2A2B] hover:bg-[#B83B2B] border border-[rgba(184,59,43,0.5)] shadow-[0_2px_10px_rgba(158,42,43,0.3)] active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-60 tracking-wider"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>正在启动...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{hasStarted ? '再次下载安装' : '立即下载并更新'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
