/**
 * Client-Side Smart Image Compressor for EncChat (墨隐)
 * - Converts any image (JPEG, PNG, HEIC, GIF, WebP) to high-quality WebP
 * - Strips all EXIF metadata (GPS geolocation, camera serial, device model) for zero-trace privacy
 * - Resizes proportionally within max bounds (1600px)
 * - Targets optimal balance: ~100KB - 350KB payload (far below Cloudflare DO 2MB SQLite row limit)
 */

export interface CompressedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  size: number; // in bytes
}

const MAX_DIMENSION = 1600;
const INITIAL_QUALITY = 0.85;
const MAX_PAYLOAD_BYTES = 1.2 * 1024 * 1024; // 1.2 MB safety threshold for DO SQLite

export async function compressImage(file: File): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    // 1. Create an image element to read raw dimensions
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('无法读取图片文件'));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('无法解析图片内容'));

      img.onload = () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          if (!originalWidth || !originalHeight) {
            reject(new Error('无效的图片尺寸'));
            return;
          }

          // 2. Compute proportional scaling within MAX_DIMENSION
          let targetWidth = originalWidth;
          let targetHeight = originalHeight;

          if (originalWidth > MAX_DIMENSION || originalHeight > MAX_DIMENSION) {
            if (originalWidth >= originalHeight) {
              targetWidth = MAX_DIMENSION;
              targetHeight = Math.round((originalHeight * MAX_DIMENSION) / originalWidth);
            } else {
              targetHeight = MAX_DIMENSION;
              targetWidth = Math.round((originalWidth * MAX_DIMENSION) / originalHeight);
            }
          }

          const aspectRatio = Number((targetWidth / targetHeight).toFixed(4));

          // 3. Render into Canvas (this automatically strips all EXIF metadata)
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d', { alpha: true });
          if (!ctx) {
            reject(new Error('无法创建图形渲染上下文'));
            return;
          }

          // High-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // 4. Export to WebP (with JPEG fallback if WebP is unsupported)
          let quality = INITIAL_QUALITY;
          let mimeType = 'image/webp';

          // Test WebP support
          let dataUrl = canvas.toDataURL(mimeType, quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            mimeType = 'image/jpeg';
            dataUrl = canvas.toDataURL(mimeType, quality);
          }

          // 5. Adaptive step-down if file is unusually large
          let byteLength = Math.round((dataUrl.length * 3) / 4);
          if (byteLength > MAX_PAYLOAD_BYTES) {
            quality = 0.72;
            dataUrl = canvas.toDataURL(mimeType, quality);
            byteLength = Math.round((dataUrl.length * 3) / 4);
          }

          resolve({
            dataUrl,
            width: targetWidth,
            height: targetHeight,
            aspectRatio,
            size: byteLength,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human-readable string (e.g., 145 KB)
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
