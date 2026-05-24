export const processSignatureOrStamp = (file: File, type: 'signature' | 'stamp'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر إعداد بيئة معالجة الصور ثنائية الأبعاد (Canvas Context)'));
          return;
        }

        // Limit processing dimension to 1200px max to protect CPU memory and ensure quick pixel scanning
        const maxProcessDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxProcessDim || h > maxProcessDim) {
          if (w > h) {
            h = Math.round((h * maxProcessDim) / w);
            w = maxProcessDim;
          } else {
            w = Math.round((w * maxProcessDim) / h);
            h = maxProcessDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        let minX = w;
        let maxX = 0;
        let minY = h;
        let maxY = 0;
        let inkPixelCount = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            const maxVal = Math.max(r, g, b);
            const minVal = Math.min(r, g, b);
            const colorDiff = maxVal - minVal;

            let isInk = false;
            if (type === 'signature') {
              isInk = (brightness < 185) || (colorDiff > 35 && brightness < 225);
            } else {
              isInk = (brightness < 195) || (colorDiff > 30 && brightness < 228);
            }

            if (isInk) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              inkPixelCount++;
            }
          }
        }

        const originalWidth = maxX - minX + 1;
        const originalHeight = maxY - minY + 1;

        if (inkPixelCount < 180 || originalWidth < 12 || originalHeight < 12) {
          reject(new Error(
            type === 'signature' 
              ? 'صورة التوقيع غير صالحة أو غير واضحة. يرجى رفع صورة تحتوي على التوقيع بخط واضح على خلفية بيضاء أو فاتحة، مع تجنب الصور الفارغة أو الصور المشوهة بالكامل.'
              : 'صورة الختم غير صالحة أو غير واضحة. يرجى رفع صورة الختم الدائري أو المربع باللون الأحمر أو الأزرق بشكل واجهة واضحة، مع تجنب لقطات الشاشة الفارغة.'
          ));
          return;
        }

        const paddingValue = Math.max(20, Math.round(Math.min(w, h) * 0.06));
        const cropMinX = Math.max(0, minX - paddingValue);
        const cropMaxX = Math.min(w - 1, maxX + paddingValue);
        const cropMinY = Math.max(0, minY - paddingValue);
        const cropMaxY = Math.min(h - 1, maxY + paddingValue);

        const boxWidth = cropMaxX - cropMinX + 1;
        const boxHeight = cropMaxY - cropMinY + 1;

        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) {
          reject(new Error('خطأ في إعداد معالج الصور التلقائي'));
          return;
        }

        cropCanvas.width = boxWidth;
        cropCanvas.height = boxHeight;

        const cropData = ctx.getImageData(cropMinX, cropMinY, boxWidth, boxHeight);
        const pixels = cropData.data;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const maxVal = Math.max(r, g, b);
          const minVal = Math.min(r, g, b);
          const colorDiff = maxVal - minVal;

          if (brightness > 195 && colorDiff < 30) {
            pixels[i + 3] = 0; 
          } else if (brightness > 175 && colorDiff < 20) {
            const alphaRatio = (195 - brightness) / 20;
            pixels[i + 3] = Math.max(0, Math.min(255, Math.round(alphaRatio * 255)));
          } else {
            if (type === 'signature') {
              pixels[i] = Math.max(0, Math.round(r * 0.8));
              pixels[i + 1] = Math.max(0, Math.round(g * 0.8));
              pixels[i + 2] = Math.max(0, Math.round(b * 0.8));
            } else {
              if (colorDiff > 25) {
                pixels[i] = Math.min(255, Math.round(r * 1.15));
                pixels[i + 1] = Math.min(255, Math.round(g * 0.9));
                pixels[i + 2] = Math.min(255, Math.round(b * 0.9));
              } else {
                pixels[i] = Math.max(0, Math.round(r * 0.75));
                pixels[i + 1] = Math.max(0, Math.round(g * 0.75));
                pixels[i + 2] = Math.max(0, Math.round(b * 0.75));
              }
            }
            pixels[i + 3] = 255; 
          }
        }

        cropCtx.putImageData(cropData, 0, 0);

        const targetMaxDim = type === 'signature' ? 320 : 180;
        let finalW = boxWidth;
        let finalH = boxHeight;
        if (finalW > targetMaxDim || finalH > targetMaxDim) {
          if (finalW > finalH) {
            finalH = Math.round((finalH * targetMaxDim) / finalW);
            finalW = targetMaxDim;
          } else {
            finalW = Math.round((finalW * targetMaxDim) / finalH);
            finalH = targetMaxDim;
          }
        }

        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) {
          reject(new Error('خطأ في إعداد التصدير النهائي للصورة'));
          return;
        }

        finalCanvas.width = finalW;
        finalCanvas.height = finalH;
        finalCtx.drawImage(cropCanvas, 0, 0, finalW, finalH);

        resolve(finalCanvas.toDataURL('image/png', 0.95));
      };
      img.onerror = () => reject(new Error('تعذر قراءة أو تحميل ملف الصورة المصدرية.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف المختار من الذاكرة المحليّة.'));
    reader.readAsDataURL(file);
  });
};

export const processLogoOrFavicon = (file: File, type: 'logo' | 'favicon'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas Context Error'));
          return;
        }

        let w = img.width;
        let h = img.height;
        let targetMaxDim = type === 'logo' ? 400 : 64; 

        if (w > targetMaxDim || h > targetMaxDim) {
          if (w > h) {
            h = Math.round((h * targetMaxDim) / w);
            w = targetMaxDim;
          } else {
            w = Math.round((w * targetMaxDim) / h);
            h = targetMaxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        
        if (type === 'logo') {
          // Keep transparent bg for logo
          ctx.drawImage(img, 0, 0, w, h);
        } else {
          // Favicon needs to be square mostly, let's just resize it and keep transparency
          ctx.drawImage(img, 0, 0, w, h);
        }

        resolve(canvas.toDataURL('image/png', 0.95));
      };
      img.onerror = () => reject(new Error('تعذر قراءة صورة الشعار/الأيقونة'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
};
