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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-[#16181f] via-[#0f1117] to-[#0a0c10] border border-[#a83232]/40 shadow-[0_16px_48px_rgba(0,0,0,0.8),0_0_24px_rgba(168,50,50,0.15)] overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Banner */}
        <div className="relative px-6 pt-6 pb-4 border-b border-stone-800/80 bg-gradient-to-r from-[#211215]/80 via-[#181a22]/80 to-[#121622]/80 flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#a83232]/15 border border-[#a83232]/50 flex items-center justify-center shadow-[0_0_16px_rgba(168,50,50,0.3)] shrink-0">
              <Sparkles className="w-6 h-6 text-[#e5c158]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-base font-bold text-stone-100 tracking-wide">
                  墨隐 · 版本更新
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[#a83232]/25 text-[#e05656] border border-[#a83232]/40">
                  新版已就绪
                </span>
              </div>
              <div className="text-xs text-stone-400 font-mono mt-1 flex items-center space-x-1.5">
                <span>v{CURRENT_VERSION}</span>
                <span className="text-[#a83232]">➔</span>
                <span className="text-[#e5c158] font-bold">v{versionInfo.latestVersion}</span>
                {versionInfo.pubDate && (
                  <span className="text-stone-500 text-[11px] font-serif">({versionInfo.pubDate})</span>
                )}
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

        {/* Release Notes Body */}
        <div className="px-6 py-5 max-h-[46vh] overflow-y-auto space-y-3 font-serif">
          <div className="text-xs text-stone-400 font-medium tracking-wider text-[11px]">
            更新典要
          </div>
          <div className="space-y-2 bg-stone-900/50 rounded-xl p-3.5 border border-stone-800/60">
            {notesList.map((item, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-stone-300 leading-relaxed">
                <span className="text-[#d6a75d] text-[10px] mt-0.5 shrink-0">✦</span>
                <span className="break-words">{item}</span>
              </div>
            ))}
          </div>

          {hasStarted && (
            <div className="flex items-center space-x-2 p-3 rounded-xl bg-[#6dbb89]/10 border border-[#6dbb89]/30 text-[#6dbb89] text-xs font-serif animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>下载任务已启动，请留意通知栏进度；下载完成后将自动唤起系统安装。</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-800/80 bg-[#0c0e12]/60 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-serif text-stone-400 hover:text-stone-200 hover:bg-stone-800/50 transition-colors"
          >
            稍后再说
          </button>

          <button
            type="button"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-5 py-2.5 rounded-xl text-xs font-serif font-bold text-white bg-gradient-to-r from-[#a83232] to-[#c24141] hover:from-[#b93838] hover:to-[#d14b4b] shadow-[0_4px_16px_rgba(168,50,50,0.4)] active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
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
