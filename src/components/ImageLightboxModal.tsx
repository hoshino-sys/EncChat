import React, { useEffect, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { DecryptedImagePayload } from '../types/chat';
import { formatByteSize } from '../utils/imageCompressor';

interface ImageLightboxModalProps {
  image: DecryptedImagePayload;
  senderName?: string;
  timestamp?: number;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  image,
  senderName,
  timestamp,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = image.data;
      const ts = timestamp ? new Date(timestamp).toISOString().replace(/[:.]/g, '-') : Date.now();
      a.download = `moyin_enc_img_${ts}.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Download image error:', err);
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.3, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.3, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleResetZoom = () => {
    setScale(1);
    setRotation(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0B0D]/95 backdrop-blur-md select-none animate-fadeIn"
      onClick={onClose}
    >
      {/* Top action bar */}
      <div
        className="w-full flex items-center justify-between px-4 py-3 bg-[#141619]/90 border-b border-[rgba(230,228,221,0.08)] text-[#6E737B] z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#9E2A2B] shadow-[0_0_8px_rgba(158,42,43,0.8)]" />
          <div>
            <span className="text-xs font-serif font-medium text-[#E6E4DD] tracking-wider">
              {senderName ? `${senderName} 的密印图函` : '密函图印'}
            </span>
            <div className="text-[10px] text-[#6E737B] font-sans">
              {image.width} × {image.height}
              {image.size ? ` · ${formatByteSize(image.size)}` : ''}
              {timestamp ? ` · ${new Date(timestamp).toLocaleTimeString()}` : ''}
            </div>
          </div>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-[4px] hover:bg-[rgba(230,228,221,0.06)] text-[#6E737B] hover:text-[#E6E4DD] transition-colors cursor-pointer"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-[4px] hover:bg-[rgba(230,228,221,0.06)] text-[#6E737B] hover:text-[#E6E4DD] transition-colors cursor-pointer"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 rounded-[4px] hover:bg-[rgba(230,228,221,0.06)] text-[#6E737B] hover:text-[#E6E4DD] transition-colors cursor-pointer"
            title="顺时针旋转"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-[4px] hover:bg-[#9E2A2B]/20 text-[#d15c5c] hover:text-[#E6E4DD] transition-colors cursor-pointer"
            title="保存至本地"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-[rgba(230,228,221,0.1)] mx-1" />
          <button
            onClick={onClose}
            className="p-2 rounded-[4px] hover:bg-[rgba(230,228,221,0.08)] text-[#6E737B] hover:text-[#E6E4DD] transition-colors cursor-pointer"
            title="关闭 (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main image container */}
      <div
        className="flex-1 w-full flex items-center justify-center p-4 overflow-hidden"
        onClick={handleResetZoom}
      >
        <div
          className="relative transition-transform duration-200 ease-out cursor-zoom-out"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={image.data}
            alt="解密密图"
            className="max-h-[82vh] max-w-[92vw] object-contain rounded-[4px] shadow-2xl border border-[rgba(230,228,221,0.1)] pointer-events-auto"
            draggable={false}
          />
        </div>
      </div>

      {/* Footer hint */}
      <div
        className="text-[11px] text-[#6E737B] font-sans pb-3 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        轻触任意空白区域或按 Esc 即可封缄退回
      </div>
    </div>
  );
};
