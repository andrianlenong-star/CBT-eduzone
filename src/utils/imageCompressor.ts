/**
 * Utility to compress and optimize images client-side for storage in localStorage and Firestore
 */
export function compressImageFile(
  file: File,
  maxWidth = 360,
  maxHeight = 360,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. If it's an SVG file, keep as SVG dataURL directly (already vector & lightweight)
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    // 2. Read file to Image object and draw on Canvas for resizing and compression
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          resolve(event.target?.result as string);
          return;
        }

        // Calculate aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw image resized
        ctx.drawImage(img, 0, 0, width, height);

        // Keep transparency if PNG or WebP
        const isTransparentFormat =
          file.type === 'image/png' ||
          file.type === 'image/webp' ||
          file.name.toLowerCase().endsWith('.png') ||
          file.name.toLowerCase().endsWith('.webp');

        try {
          const mimeType = isTransparentFormat ? 'image/png' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);
          resolve(compressedDataUrl);
        } catch (canvasErr) {
          console.warn('Canvas export failed, falling back to original dataURL:', canvasErr);
          resolve(event.target?.result as string);
        }
      };

      img.onerror = () => {
        // Fallback to direct dataURL
        resolve(event.target?.result as string);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
