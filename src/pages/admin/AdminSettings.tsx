import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  ShieldCheck, 
  Image as ImageIcon, 
  Upload, 
  LayoutGrid, 
  Wallet, 
  Lock, 
  Mail, 
  Smartphone,
  Globe,
  DollarSign,
  Percent,
  Clock,
  Palette,
  FileText,
  Share2,
  Trash2,
  Plus,
  Save,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  TrendingUp,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type SettingsTab = 'general' | 'ui' | 'finance' | 'security' | 'support' | 'legal';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

const processSignatureOrStamp = (file: File, type: 'signature' | 'stamp'): Promise<string> => {
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

        // Bounding Box algorithm for finding signature/stamp "ink" and cutting off screenshots/background clutter.
        // We crop out white space, yellow-light backgrounds, and status bar lines.
        let minX = w;
        let maxX = 0;
        let minY = h;
        let maxY = 0;
        let inkPixelCount = 0;

        // Signature is usually dark/colored line strokes (blue pen, black ink) on paper.
        // Stamp is usually circular or rectangular solid color pattern (red, blue, or violet).
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
              // Signatures are slim/thin dark lines or colored pen strokes
              // Brightness less than 185 (dark ink), or high color distinction (blue/purple pen, colorDiff > 35)
              isInk = (brightness < 185) || (colorDiff > 35 && brightness < 225);
            } else {
              // Stamps are circular/solid red/blue/purple inks. Matches lower brightness or high color saturation
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

        // REJECT IF NO LOGICAL SIGNATURE OR STAMP FOUND
        // A minimal threshold of ink pixel density ensures we reject empty screenshots, blank screens, or uniform solid backdrops.
        if (inkPixelCount < 180 || originalWidth < 12 || originalHeight < 12) {
          reject(new Error(
            type === 'signature' 
              ? 'صورة التوقيع غير صالحة أو غير واضحة. يرجى رفع صورة تحتوي على التوقيع بخط واضح على خلفية بيضاء أو فاتحة، مع تجنب الصور الفارغة أو الصور المشوهة بالكامل.'
              : 'صورة الختم غير صالحة أو غير واضحة. يرجى رفع صورة الختم الدائري أو المربع باللون الأحمر أو الأزرق بشكل واجهة واضحة، مع تجنب لقطات الشاشة الفارغة.'
          ));
          return;
        }

        // Add safety padding of e.g. 6% of size or at least 20px to prevent clipping edges
        const paddingValue = Math.max(20, Math.round(Math.min(w, h) * 0.06));
        const cropMinX = Math.max(0, minX - paddingValue);
        const cropMaxX = Math.min(w - 1, maxX + paddingValue);
        const cropMinY = Math.max(0, minY - paddingValue);
        const cropMaxY = Math.min(h - 1, maxY + paddingValue);

        const boxWidth = cropMaxX - cropMinX + 1;
        const boxHeight = cropMaxY - cropMinY + 1;

        // Create secondary canvas to isolate, crop, and run background removal
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

        // Perform transparent background extraction and ink crisp enhancement
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const maxVal = Math.max(r, g, b);
          const minVal = Math.min(r, g, b);
          const colorDiff = maxVal - minVal;

          // Transparent filter threshold
          // If pixel is light/white/yellow (brightness > 200 and not heavily saturated color), make it fully transparent (transparentise)
          if (brightness > 195 && colorDiff < 30) {
            pixels[i + 3] = 0; // Transparent alpha
          } else if (brightness > 175 && colorDiff < 20) {
            // Anti-aliasing margin feathering
            const alphaRatio = (195 - brightness) / 20;
            pixels[i + 3] = Math.max(0, Math.min(255, Math.round(alphaRatio * 255)));
          } else {
            // Ink pixel: Boost ink crisp/vibrancy for a professional outcome
            if (type === 'signature') {
              // Enhance pen stroke darkness
              const factor = 1.1; // Dark contrast factor
              pixels[i] = Math.max(0, Math.round(r * 0.8));
              pixels[i + 1] = Math.max(0, Math.round(g * 0.8));
              pixels[i + 2] = Math.max(0, Math.round(b * 0.8));
            } else {
              // Stamp colors: rich red or rich blue
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
            pixels[i + 3] = 255; // Keep background-removed foreground elements opaque
          }
        }

        cropCtx.putImageData(cropData, 0, 0);

        // Final Scale down to match ideal document/print rendering sizes (while saving Firestore space, base64 < 80kb)
        // Signatures are best fit at around 320px width, Stamps around 180px
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

const processLogoOrFavicon = (file: File, type: 'logo' | 'favicon'): Promise<string> => {
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

        // Limit processing dimension to 1200px max
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

        // Auto Bounding Box detection for non-white / colorful content
        let minX = w;
        let maxX = 0;
        let minY = h;
        let maxY = 0;
        let contentPixelCount = 0;

        for (let y = 0; y < h; y++) {
          if (y < h * 0.05 || y > h * 0.95) continue;

          for (let x = 0; x < w; x++) {
            if (x < w * 0.03 || x > w * 0.97) continue;

            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            if (brightness < 242) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              contentPixelCount++;
            }
          }
        }

        let boxWidth = maxX - minX + 1;
        let boxHeight = maxY - minY + 1;
        let useCropping = true;

        if (contentPixelCount < 100 || boxWidth < 10 || boxHeight < 10) {
          minX = 0;
          minY = 0;
          boxWidth = w;
          boxHeight = h;
          useCropping = false;
        }

        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) {
          reject(new Error('خطأ في إعداد معالج الصور التلقائي'));
          return;
        }

        cropCanvas.width = boxWidth;
        cropCanvas.height = boxHeight;

        if (useCropping) {
          cropCtx.drawImage(img, minX, minY, boxWidth, boxHeight, 0, 0, boxWidth, boxHeight);
        } else {
          cropCtx.drawImage(img, 0, 0, w, h, 0, 0, boxWidth, boxHeight);
        }

        const cropImgData = cropCtx.getImageData(0, 0, boxWidth, boxHeight);
        const pixels = cropImgData.data;

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          if (a > 0) {
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            const maxVal = Math.max(r, g, b);
            const minVal = Math.min(r, g, b);
            const colorDiff = maxVal - minVal;

            if (brightness > 240 && colorDiff < 15) {
              pixels[i + 3] = 0;
            } else if (brightness > 215 && colorDiff < 15) {
              const alphaRatio = (240 - brightness) / 25;
              pixels[i + 3] = Math.max(0, Math.min(255, Math.round(alphaRatio * 255)));
            }
          }
        }

        cropCtx.putImageData(cropImgData, 0, 0);

        const targetMaxDim = type === 'logo' ? 400 : 96;
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
          reject(new Error('خطأ في إعداد التصدير النهائي للشعار'));
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

export const AdminSettings: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Signature / Stamp Processing States
  const [sigProcessing, setSigProcessing] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const [stampProcessing, setStampProcessing] = useState(false);
  const [stampError, setStampError] = useState<string | null>(null);
  const [isSigDragOver, setIsSigDragOver] = useState(false);
  const [isStampDragOver, setIsStampDragOver] = useState(false);

  // Logo / Favicon Processing States
  const [logoProcessing, setLogoProcessing] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isLogoDragOver, setIsLogoDragOver] = useState(false);
  const [faviconProcessing, setFaviconProcessing] = useState(false);
  const [faviconError, setFaviconError] = useState<string | null>(null);
  const [isFaviconDragOver, setIsFaviconDragOver] = useState(false);

  const handleSignatureUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSigError('يرجى اختيار ملف صورة صالح (PNG، JPG، JPEG)');
      return;
    }
    setSigProcessing(true);
    setSigError(null);
    try {
      const processedBase64 = await processSignatureOrStamp(file, 'signature');
      setGeneral(p => ({ ...p, signatureUrl: processedBase64 }));
      showToast('تمت معالجة وتفريغ التوقيع وتلقينه بنجاح');
    } catch (err: any) {
      setSigError(err.message || 'فشل معالجة صورة التوقيع');
      showToast('فشل في معالجة التوقيع المرفوع', 'error');
    } finally {
      setSigProcessing(false);
    }
  };

  const handleStampUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStampError('يرجى اختيار ملف صورة صالح (PNG، JPG، JPEG)');
      return;
    }
    setStampProcessing(true);
    setStampError(null);
    try {
      const processedBase64 = await processSignatureOrStamp(file, 'stamp');
      setGeneral(p => ({ ...p, stampUrl: processedBase64 }));
      showToast('تمت معالجة وتفريغ الختم بنجاح');
    } catch (err: any) {
      setStampError(err.message || 'فشل معالجة صورة الختم');
      showToast('فشل في معالجة الختم المرفوع', 'error');
    } finally {
      setStampProcessing(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setLogoError('يرجى اختيار ملف صورة صالح (PNG، JPG، JPEG)');
      return;
    }
    setLogoProcessing(true);
    setLogoError(null);
    try {
      const processedBase64 = await processLogoOrFavicon(file, 'logo');
      setGeneral(p => ({ ...p, logoUrl: processedBase64 }));
      showToast('تمت معالجة وتفريغ الشعار بنجاح');
    } catch (err: any) {
      setLogoError(err.message || 'فشل معالجة صورة الشعار');
      showToast('فشل في معالجة الشعار المرفوع', 'error');
    } finally {
      setLogoProcessing(false);
    }
  };

  const handleFaviconUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFaviconError('يرجى اختيار ملف صورة صالح (PNG، JPG، JPEG)');
      return;
    }
    setFaviconProcessing(true);
    setFaviconError(null);
    try {
      const processedBase64 = await processLogoOrFavicon(file, 'favicon');
      setGeneral(p => ({ ...p, faviconUrl: processedBase64 }));
      showToast('تمت معالجة وتفريغ الأيقونة بنجاح');
    } catch (err: any) {
      setFaviconError(err.message || 'فشل معالجة صورة الأيقونة');
      showToast('فشل في معالجة الأيقونة المرفوعة', 'error');
    } finally {
      setFaviconProcessing(false);
    }
  };

  // Settings States
  const [general, setGeneral] = useState({ 
    platformName: '', 
    platformTagline: '', 
    logoUrl: '', 
    faviconUrl: '',
    signatoryName: '',
    signatoryTitle: '',
    signatureUrl: '',
    stampUrl: '',
    stampText: ''
  });
  const [homeCard, setHomeCard] = useState({ imageUrl: '', quote: '', author: '' });
  const [announcement, setAnnouncement] = useState({ text: '', type: 'info', isActive: false, link: '' });
  const [appearance, setAppearance] = useState({ primaryColor: '#2563eb', theme: 'light', font: 'inter' });
  const [finance, setFinance] = useState({ commission: 5, minWithdraw: 100, vatRate: 15, payoutCycle: 'weekly', minEscrow: 50 });
  const [security, setSecurity] = useState({ maintenanceMode: false, maintenanceMessage: '', forceVerification: true, sessionLimit: 24 });
  const [support, setSupport] = useState({ email: '', phone: '', address: '', whatsapp: '', twitter: '', instagram: '' });
  const [legal, setLegal] = useState({ tosLink: '', privacyLink: '', refundLink: '' });
  const [heroBanner, setHeroBanner] = useState({ 
    titleTop: 'ضمانك الموثوق', 
    titleBottom: 'في العالم الرقمي', 
    subtitle: 'خطوات مدروسة تقنياً لضمان سلامة كل ريال من طرفي الصفقة.',
    showUserCards: true,
    trustMessages: [
      "الخيار الأول للتعاملات الآمنة",
      "وساطة مالية ذكية وموثوقة",
      "حقك محفوظ بأمان تام",
      "دفع إلكتروني معتمد 100%",
      "خدمة تقسيط المدفوعات متوفرة الآن"
    ]
  });

  useEffect(() => {
    if (!isAdmin) return;

    const unsubs = [
      onSnapshot(doc(db, 'app_settings', 'general'), d => d.exists() && setGeneral(prev => ({ ...prev, ...d.data() })), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/general')),
      onSnapshot(doc(db, 'app_settings', 'home_card'), d => d.exists() && setHomeCard(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/home_card')),
      onSnapshot(doc(db, 'app_settings', 'announcement'), d => d.exists() && setAnnouncement(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/announcement')),
      onSnapshot(doc(db, 'app_settings', 'appearance'), d => d.exists() && setAppearance(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/appearance')),
      onSnapshot(doc(db, 'app_settings', 'finance'), d => d.exists() && setFinance(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/finance')),
      onSnapshot(doc(db, 'app_settings', 'security'), d => d.exists() && setSecurity(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/security')),
      onSnapshot(doc(db, 'app_settings', 'support'), d => d.exists() && setSupport(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/support')),
      onSnapshot(doc(db, 'app_settings', 'legal'), d => d.exists() && setLegal(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/legal')),
      onSnapshot(doc(db, 'app_settings', 'hero_banner'), d => d.exists() && setHeroBanner(d.data() as any), (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/hero_banner')),
    ];
    setLoading(false);
    return () => unsubs.forEach(u => u());
  }, [isAdmin]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveSettings = async (path: string, data: any) => {
    setSaving(path);
    try {
      await setDoc(doc(db, 'app_settings', path), { ...data, updatedAt: serverTimestamp() });
      showToast('تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSaving(null), 1000);
    } catch (e) {
      showToast('خطأ أثناء حفظ الإعدادات', 'error');
      setSaving(null);
    }
  };

  const tabs = [
    { id: 'general', label: 'الإعدادات العامة', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'ui', label: 'الواجهة والتصميم', icon: <Palette className="w-4 h-4" /> },
    { id: 'finance', label: 'السياسات المالية', icon: <Wallet className="w-4 h-4" /> },
    { id: 'security', label: 'الأمان والنظام', icon: <Lock className="w-4 h-4" /> },
    { id: 'support', label: 'تواصل ودعم', icon: <Mail className="w-4 h-4" /> },
    { id: 'legal', label: 'السياسات القانونية', icon: <FileText className="w-4 h-4" /> },
  ];

  if (loading) return <div className="h-96 flex items-center justify-center text-gray-400 font-bold italic">جاري تحميل إعدادات النظام...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight italic">إعدادات <span className="text-blue-600">المنصة</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">القوة والتحكم الكامل في هوية وتشغيل خيارات التمر</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] tracking-widest uppercase border border-blue-100 italic transition-transform hover:scale-105">
          <ShieldCheck className="w-4 h-4" />
          بيئة تحكم مشفرة
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:w-72 space-y-2 sticky top-8 h-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                ? 'bg-gray-950 text-white shadow-2xl shadow-gray-200 translate-x-2' 
                : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100 hover:border-blue-100'
              }`}
            >
              <div className="flex items-center gap-3">
                {tab.icon}
                {tab.label}
              </div>
              {activeTab === tab.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Tab Header */}
              <div className="mb-8 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${activeTab === 'finance' ? 'bg-green-50 text-green-600' : activeTab === 'security' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {tabs.find(t => t.id === activeTab)?.icon}
                  </div>
                  <div>
                    <h2 className="font-black text-lg italic">{tabs.find(t => t.id === activeTab)?.label}</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">تعديل بارامترات {tabs.find(t => t.id === activeTab)?.label}</p>
                  </div>
                </div>
                {saving && (
                  <div className="flex items-center gap-2 text-blue-600 animate-pulse">
                     <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                     <span className="text-[10px] font-black uppercase">جاري الحفظ</span>
                  </div>
                )}
              </div>

              {/* GENERAL SETTINGS */}
              {activeTab === 'general' && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">اسم المنصة</label>
                       <input 
                         type="text" 
                         value={general.platformName}
                         onChange={e => setGeneral(p => ({...p, platformName: e.target.value}))}
                         placeholder="مثال: خيارات التمر"
                         className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">وصف المنصة (Tagline)</label>
                       <input 
                         type="text" 
                         value={general.platformTagline}
                         onChange={e => setGeneral(p => ({...p, platformTagline: e.target.value}))}
                         placeholder="مثال: سوق التمور الإلكتروني الأكثر أماناً"
                         className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all"
                       />
                    </div>
                     {/* Platform Logo Customization block */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">شعار المنصة الرسمي (شعار علوي)</label>
                        
                        {general.logoUrl ? (
                          <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full font-black">الشعار جاهز ومفرّغ تلقائياً</span>
                              <button
                                type="button"
                                onClick={() => setGeneral(p => ({ ...p, logoUrl: '' }))}
                                className="text-red-500 hover:text-red-600 text-[10px] font-black flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                حذف الشعار
                              </button>
                            </div>
                            <div 
                              className="w-full h-24 rounded-xl flex items-center justify-center p-2 relative overflow-hidden"
                              style={{
                                backgroundImage: `radial-gradient(#e5e7eb 20%, transparent 20%), radial-gradient(#e5e7eb 20%, transparent 20%)`,
                                backgroundPosition: '0 0, 8px 8px',
                                backgroundSize: '16px 16px',
                                backgroundColor: '#fcfcfc'
                              }}
                            >
                              <img 
                                src={general.logoUrl} 
                                alt="شعار المنصة" 
                                className="max-h-full max-w-full object-contain filter drop-shadow-sm select-none"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        ) : (
                          <div
                            onDragOver={(e) => { e.preventDefault(); setIsLogoDragOver(true); }}
                            onDragLeave={() => setIsLogoDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsLogoDragOver(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleLogoUpload(e.dataTransfer.files[0]);
                              }
                            }}
                            className={`border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center relative ${
                              isLogoDragOver 
                                ? 'border-blue-500 bg-blue-50/40' 
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100/50'
                            }`}
                          >
                            <input 
                              type="file"
                              accept="image/*"
                              id="logo-file-upload"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleLogoUpload(e.target.files[0]);
                                }
                              }}
                            />
                            {logoProcessing ? (
                              <div className="space-y-2 py-2">
                                <Upload className="w-6 h-6 text-blue-500 animate-bounce mx-auto" />
                                <span className="text-xs font-black text-gray-950 block">جاري معالجة وتفريغ الشعار...</span>
                                <span className="text-[9px] text-gray-400 font-bold block">نقوم بمسح الحواف وعزل الخلفية للشفافية</span>
                              </div>
                            ) : (
                              <label htmlFor="logo-file-upload" className="cursor-pointer space-y-2 py-1 w-full block">
                                <Upload className="w-6 h-6 text-gray-400 mx-auto transition-transform hover:scale-110" />
                                <span className="text-xs font-black text-gray-700 block">اضغط لرفع الشعار أو اسحبه هنا</span>
                                <span className="text-[9px] text-gray-400 font-black block">نقوم بتهيئة الشعار وتفريغ لونه الأبيض تلقائياً ليلائم جميع الخلفيات</span>
                              </label>
                            )}
                          </div>
                        )}
                        
                        {logoError && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold flex items-start gap-2 leading-relaxed animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{logoError}</span>
                          </div>
                        )}
                     </div>

                     {/* Platform Favicon Customization block */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">أيقونة المنصة الصغيرة (Favicon)</label>
                        
                        {general.faviconUrl ? (
                          <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full font-black">جاهزة ومفرّغ تلقائياً</span>
                              <button
                                type="button"
                                onClick={() => setGeneral(p => ({ ...p, faviconUrl: '' }))}
                                className="text-red-500 hover:text-red-600 text-[10px] font-black flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                حذف الأيقونة
                              </button>
                            </div>
                            <div 
                              className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center p-2 relative overflow-hidden"
                              style={{
                                backgroundImage: `radial-gradient(#e5e7eb 20%, transparent 20%), radial-gradient(#e5e7eb 20%, transparent 20%)`,
                                backgroundPosition: '0 0, 4px 4px',
                                backgroundSize: '8px 8px',
                                backgroundColor: '#fcfcfc'
                              }}
                            >
                              <img 
                                src={general.faviconUrl} 
                                alt="أيقونة المنصة" 
                                className="max-h-full max-w-full object-contain filter drop-shadow-sm select-none"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        ) : (
                          <div
                            onDragOver={(e) => { e.preventDefault(); setIsFaviconDragOver(true); }}
                            onDragLeave={() => setIsFaviconDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsFaviconDragOver(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleFaviconUpload(e.dataTransfer.files[0]);
                              }
                            }}
                            className={`border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center relative ${
                              isFaviconDragOver 
                                ? 'border-blue-500 bg-blue-50/40' 
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100/50'
                            }`}
                          >
                            <input 
                              type="file"
                              accept="image/*"
                              id="favicon-file-upload"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFaviconUpload(e.target.files[0]);
                                }
                              }}
                            />
                            {faviconProcessing ? (
                              <div className="space-y-2 py-2">
                                <Upload className="w-6 h-6 text-blue-500 animate-bounce mx-auto" />
                                <span className="text-xs font-black text-gray-950 block">جاري عزل وتوليد رمز favicon...</span>
                              </div>
                            ) : (
                              <label htmlFor="favicon-file-upload" className="cursor-pointer space-y-2 py-1 w-full block">
                                <Upload className="w-6 h-6 text-gray-400 mx-auto transition-transform hover:scale-110" />
                                <span className="text-xs font-black text-gray-700 block">اضغط لرفع الرمز أو اسحبه هنا</span>
                                <span className="text-[9px] text-gray-400 font-black block">نقوم بتهيئة الصورة وتفريغ الشفافية بمقاس مثلي ومربع ۹٦×۹٦</span>
                              </label>
                            )}
                          </div>
                        )}
                        
                        {faviconError && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold flex items-start gap-2 leading-relaxed animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{faviconError}</span>
                          </div>
                        )}
                     </div>

                    {/* Report Signature & Stamp Customization */}
                    <div className="md:col-span-2 pt-6 border-t border-gray-100">
                      <h4 className="text-xs font-black text-blue-600 uppercase tracking-wider mb-1">تخصيص أختام وتوقيعات التقارير الرسمية</h4>
                      <p className="text-[10px] text-gray-400 font-bold leading-normal">تتحكم هذه الحقول بالختم والتوقيع اللذين يظهران تلقائياً في أسفل تقارير النظام المطبوعة والمصدرة بصيغة PDF.</p>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">اسم الموقّع المعتمد</label>
                       <input 
                         type="text" 
                         value={general.signatoryName || ''}
                         onChange={e => setGeneral(p => ({...p, signatoryName: e.target.value}))}
                         placeholder="مثال: أحمد عبد الله الراضي"
                         className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">المسمى الوظيفي للموقّع</label>
                       <input 
                         type="text" 
                         value={general.signatoryTitle || ''}
                         onChange={e => setGeneral(p => ({...p, signatoryTitle: e.target.value}))}
                         placeholder="مثال: المدير العام والمشرف المالي"
                         className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all"
                       />
                    </div>

                     {/* Certified Signature Upload Block */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">صورة التوقيع الرسمي المعتمد</label>
                        
                        {general.signatureUrl ? (
                          <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full font-black">جاهز ومفرّغ تلقائياً</span>
                              <button
                                type="button"
                                onClick={() => setGeneral(p => ({ ...p, signatureUrl: '' }))}
                                className="text-red-500 hover:text-red-600 text-[10px] font-black flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                حذف التوقيع
                              </button>
                            </div>
                            <div 
                              className="w-full h-24 rounded-xl flex items-center justify-center p-2 relative overflow-hidden"
                              style={{
                                backgroundImage: `radial-gradient(#e5e7eb 20%, transparent 20%), radial-gradient(#e5e7eb 20%, transparent 20%)`,
                                backgroundPosition: '0 0, 8px 8px',
                                backgroundSize: '16px 16px',
                                backgroundColor: '#fcfcfc'
                              }}
                            >
                              <img 
                                src={general.signatureUrl} 
                                alt="الموقع المحاسبي المعتمد" 
                                className="max-h-full max-w-full object-contain filter drop-shadow-sm select-none"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        ) : (
                          <div
                            onDragOver={(e) => { e.preventDefault(); setIsSigDragOver(true); }}
                            onDragLeave={() => setIsSigDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsSigDragOver(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleSignatureUpload(e.dataTransfer.files[0]);
                              }
                            }}
                            className={`border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center relative ${
                              isSigDragOver 
                                ? 'border-blue-500 bg-blue-50/40' 
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100/50'
                            }`}
                          >
                            <input 
                              type="file"
                              accept="image/*"
                              id="signature-file-upload"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleSignatureUpload(e.target.files[0]);
                                }
                              }}
                            />
                            {sigProcessing ? (
                              <div className="space-y-2 py-2">
                                <Upload className="w-6 h-6 text-blue-500 animate-bounce mx-auto" />
                                <span className="text-xs font-black text-gray-950 block">جاري فحص وتفريغ التوقيع المحاسبي...</span>
                                <span className="text-[9px] text-gray-400 font-bold block">نقوم بمسح البيكسلات، عزل الخلفيات، وتجاهل لقطات شاشات الهاتف تلقائياً</span>
                              </div>
                            ) : (
                              <label htmlFor="signature-file-upload" className="cursor-pointer space-y-2 py-1 w-full block">
                                <Upload className="w-6 h-6 text-gray-400 mx-auto transition-transform hover:scale-110" />
                                <span className="text-xs font-black text-gray-700 block">اضغط لرفع الرمز أو إسحبه إلى هنا</span>
                                <span className="text-[9px] text-gray-400 font-black block">نظام تنظيف ذكي للقطات الجوال والتحجيم الآلي للشفافية</span>
                              </label>
                            )}
                          </div>
                        )}
                        
                        {sigError && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold flex items-start gap-2 leading-relaxed animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{sigError}</span>
                          </div>
                        )}
                     </div>

                     {/* Certified Stamp Upload Block */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">صورة الختم الرسمي المعتمد</label>
                        
                        {general.stampUrl ? (
                          <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full font-black">جاهز ومفرّغ تلقائياً</span>
                              <button
                                type="button"
                                onClick={() => setGeneral(p => ({ ...p, stampUrl: '' }))}
                                className="text-red-500 hover:text-red-600 text-[10px] font-black flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                حذف الختم
                              </button>
                            </div>
                            <div 
                              className="w-full h-32 rounded-xl flex items-center justify-center p-3 relative overflow-visible"
                              style={{
                                backgroundImage: `radial-gradient(#e5e7eb 20%, transparent 20%), radial-gradient(#e5e7eb 20%, transparent 20%)`,
                                backgroundPosition: '0 0, 8px 8px',
                                backgroundSize: '16px 16px',
                                backgroundColor: '#fcfcfc'
                              }}
                            >
                              <img 
                                src={general.stampUrl} 
                                alt="ختم التوثيق المحاسبي" 
                                className="max-h-full max-w-full object-contain filter drop-shadow select-none transition-transform duration-300 hover:scale-[1.03]"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        ) : (
                          <div
                            onDragOver={(e) => { e.preventDefault(); setIsStampDragOver(true); }}
                            onDragLeave={() => setIsStampDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsStampDragOver(false);
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleStampUpload(e.dataTransfer.files[0]);
                              }
                            }}
                            className={`border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center relative ${
                              isStampDragOver 
                                ? 'border-blue-500 bg-blue-50/40' 
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100/50'
                            }`}
                          >
                            <input 
                              type="file"
                              accept="image/*"
                              id="stamp-file-upload"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleStampUpload(e.target.files[0]);
                                }
                              }}
                            />
                            {stampProcessing ? (
                              <div className="space-y-2 py-2">
                                <Upload className="w-6 h-6 text-blue-500 animate-bounce mx-auto" />
                                <span className="text-xs font-black text-gray-950 block">جاري فحص وتفريغ الختم والواجهة...</span>
                                <span className="text-[9px] text-gray-400 font-bold block">نقوم بمسح محيط الختم، عزل الخلفيات غير المرغوبة، وضبط الحدود</span>
                              </div>
                            ) : (
                              <label htmlFor="stamp-file-upload" className="cursor-pointer space-y-2 py-1 w-full block">
                                <Upload className="w-6 h-6 text-gray-400 mx-auto transition-transform hover:scale-110" />
                                <span className="text-xs font-black text-gray-700 block">اضغط لرفع الختم أو إسحبه إلى هنا</span>
                                <span className="text-[9px] text-gray-400 font-black block">نظام عزل وتنقيب الختم من الصور الملتقطة واللقطات العشوائية</span>
                              </label>
                            )}
                          </div>
                        )}
                        
                        {stampError && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold flex items-start gap-2 leading-relaxed animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{stampError}</span>
                          </div>
                        )}
                     </div>

                    <div className="space-y-2 md:col-span-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">النص الأساسي للختم الرسمي الدائري</label>
                       <input 
                         type="text" 
                         value={general.stampText || ''}
                         onChange={e => setGeneral(p => ({...p, stampText: e.target.value}))}
                         placeholder="مثال: ختم الاعتماد المالي والمطابقة لمنصة عربون"
                         className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all"
                       />
                    </div>
                  </div>
                  <button 
                    onClick={() => saveSettings('general', general)} 
                    disabled={saving === 'general'}
                    className="w-full py-5 bg-gray-950 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200"
                  >
                    {saving === 'general' ? 'جاري الحفظ...' : 'حفظ إعدادات المنصة العامة'}
                  </button>
                </div>
              )}

              {/* UI & DESIGN */}
              {activeTab === 'ui' && (
                <div className="space-y-8">
                  {/* Home Card UI */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black italic">البطاقة الترحيبية</h3>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="relative h-56 bg-gray-50 rounded-[2rem] overflow-hidden border-2 border-dashed border-gray-100 group transition-all hover:border-blue-200 shadow-inner">
                        {homeCard.imageUrl ? (
                          <img src={homeCard.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                            <Upload className="w-10 h-10 mb-2 opacity-20" />
                            <span className="text-[10px] font-black uppercase tracking-widest">ارفع صورة تعبر عن عراقة التمور</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm">
                          <Upload className="w-8 h-8 text-white mb-2" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">تغيير الصورة الإرشادية</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={e => {
                               const file = e.target.files?.[0];
                               if (file) {
                                 const reader = new FileReader();
                                 reader.onloadend = () => setHomeCard(p => ({ ...p, imageUrl: reader.result as string }));
                                 reader.readAsDataURL(file);
                               }
                            }} 
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">النص التسويقي (Quote)</label>
                          <textarea 
                            value={homeCard.quote} 
                            onChange={e => setHomeCard(p => ({...p, quote: e.target.value}))} 
                            placeholder="اقتباس أو حكمة عن التمر..."
                            className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all min-h-[120px] resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">القائل / المصدر</label>
                          <input 
                            type="text" 
                            value={homeCard.author} 
                            onChange={e => setHomeCard(p => ({...p, author: e.target.value}))} 
                            className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => saveSettings('home_card', homeCard)} 
                      disabled={saving === 'home_card'}
                      className="w-full py-5 bg-gray-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200"
                    >
                      {saving === 'home_card' ? 'جاري الحفظ...' : 'تحديث البطاقة الرئيسية'}
                    </button>
                  </div>

                  {/* Announcement Banner */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black italic">بانر الصفحة الرئيسية (Hero Section)</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">العنوان العلوي</label>
                          <input 
                            type="text" 
                            value={heroBanner.titleTop} 
                            onChange={e => setHeroBanner(p => ({...p, titleTop: e.target.value}))} 
                            className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">العنوان السفلي (ملون)</label>
                          <input 
                            type="text" 
                            value={heroBanner.titleBottom} 
                            onChange={e => setHeroBanner(p => ({...p, titleBottom: e.target.value}))} 
                            className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all" 
                          />
                        </div>
                        <div className="space-y-2 flex items-center gap-3 pt-6">
                          <input 
                            type="checkbox" 
                            id="showUserCards"
                            checked={heroBanner.showUserCards} 
                            onChange={e => setHeroBanner(p => ({...p, showUserCards: e.target.checked}))} 
                            className="w-5 h-5 accent-blue-600" 
                          />
                          <label htmlFor="showUserCards" className="text-sm font-bold text-gray-700 cursor-pointer">إظهار بطاقات المستخدمين في الهيرو</label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الوصف المختصر</label>
                        <textarea 
                          value={heroBanner.subtitle} 
                          onChange={e => setHeroBanner(p => ({...p, subtitle: e.target.value}))} 
                          className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-blue-500 outline-none transition-all min-h-[80px] resize-none"
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">رسائل الثقة (المتحركة في الهيرو)</label>
                        <div className="space-y-3">
                          {heroBanner.trustMessages.map((msg, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input 
                                type="text" 
                                value={msg} 
                                onChange={e => {
                                  const newMsgs = [...heroBanner.trustMessages];
                                  newMsgs[idx] = e.target.value;
                                  setHeroBanner(p => ({...p, trustMessages: newMsgs}));
                                }}
                                className="flex-1 bg-gray-50 rounded-xl p-3 text-xs font-bold border border-transparent focus:border-blue-500 outline-none" 
                              />
                              <button 
                                onClick={() => {
                                  const newMsgs = heroBanner.trustMessages.filter((_, i) => i !== idx);
                                  setHeroBanner(p => ({...p, trustMessages: newMsgs}));
                                }}
                                className="p-3 text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => setHeroBanner(p => ({...p, trustMessages: [...p.trustMessages, '']}))}
                            className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest px-3 py-2 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Plus className="w-3 h-3" />
                            إضافة رسالة ثقة
                          </button>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => saveSettings('hero_banner', heroBanner)} 
                      disabled={saving === 'hero_banner'}
                      className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100"
                    >
                      {saving === 'hero_banner' ? 'جاري الحفظ...' : 'تحديث بانر الواجهة'}
                    </button>
                  </div>

                  {/* Announcement Banner */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-black italic">إعلانات المنصة (Global Banner)</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${announcement.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                           {announcement.isActive ? 'مفعل الآن' : 'معطل مؤقتاً'}
                        </span>
                        <button 
                          onClick={() => setAnnouncement(p => ({...p, isActive: !p.isActive}))} 
                          className={`w-14 h-7 rounded-full transition-all relative ${announcement.isActive ? 'bg-green-500' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${announcement.isActive ? 'left-8' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    {/* LIVE PREVIEW AREA */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 border-dashed space-y-3">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">معاينة مباشرة</p>
                       <div className={`w-full py-2.5 px-4 rounded-xl text-center text-xs font-black relative overflow-hidden shadow-sm flex items-center justify-center gap-2 ${
                         announcement.type === 'urgent' ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white' : 
                         announcement.type === 'promo' ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white' : 
                         announcement.type === 'success' ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white' :
                         'bg-gradient-to-r from-blue-900 to-slate-900 text-white'
                       }`}>
                          {announcement.type === 'promo' && <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
                          {announcement.type === 'urgent' && <AlertCircle className="w-3.5 h-3.5 animate-bounce" />}
                          <span>{announcement.text || 'اكتب نص الإعلان هنا...'}</span>
                       </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">نص الإشعار</label>
                        <input 
                          type="text" 
                          value={announcement.text} 
                          onChange={e => setAnnouncement(p => ({...p, text: e.target.value}))} 
                          className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-purple-500 outline-none transition-all" 
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">نوع التنبيه</label>
                          <select 
                            value={announcement.type} 
                            onChange={e => setAnnouncement(p => ({...p, type: e.target.value}))} 
                            className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-purple-500 outline-none cursor-pointer"
                          >
                            <option value="info">إرشادي (أزرق)</option>
                            <option value="urgent">عاجل (أحمر)</option>
                            <option value="promo">ترويجي (بنفسجي)</option>
                            <option value="success">إيجابي (أخضر)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">رابط الإجراء (Link)</label>
                          <div className="relative">
                             <Plus className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                             <input 
                               type="text" 
                               value={announcement.link} 
                               onChange={e => setAnnouncement(p => ({...p, link: e.target.value}))} 
                               className="w-full bg-gray-50 rounded-2xl p-5 pr-12 text-sm font-bold border border-transparent focus:border-purple-500 outline-none" 
                               dir="ltr" 
                             />
                          </div>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => saveSettings('announcement', announcement)} 
                      disabled={saving === 'announcement'}
                      className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-100"
                    >
                      تحديث إعلان المنصة
                    </button>
                  </div>

                  {/* Platform Analytics Trigger */}
                  <div className="bg-gray-950 p-8 rounded-[2.5rem] text-white space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-150 duration-700" />
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                        <TrendingUp className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black italic">تحليلات المنصة الذكية</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">تحديث مؤشرات الأداء الحيوية (KPIs)</p>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-gray-400 leading-relaxed relative z-10">
                      بما أن المنصة تعتمد على نظام الحماية المتطور، يوصى بإعادة تشغيل قارئ البيانات الحقيقي دورياً لضمان دقة "إجمالي الضمانات" و "عدد المستخدمين" الفعليين في الصفحة الرئيسية.
                    </p>

                    <button 
                      onClick={async () => {
                         setSaving('stats');
                         try {
                           // Fetch total users
                           const usersSnap = await getDocs(collection(db, 'users'));
                           const totalUsers = usersSnap.size;

                           // Fetch total guarantees
                           const ordersSnap = await getDocs(collection(db, 'orders'));
                           const totalGuarantees = ordersSnap.docs.reduce((acc, doc) => {
                             const data = doc.data();
                             if (['escrowed', 'completed', 'in_progress'].includes(data.status)) {
                               return acc + (data.amount || 0);
                             }
                             return acc;
                           }, 0);

                           await setDoc(doc(db, 'app_settings', 'platform_stats'), {
                             totalUsers,
                             totalGuarantees,
                             updatedAt: serverTimestamp()
                           }, { merge: true });

                           showToast('تم تحديث إحصائيات المنصة بنجاح');
                         } catch (e) {
                           showToast('فشل تحديث الإحصائيات', 'error');
                         } finally {
                           setSaving(null);
                         }
                      }}
                      disabled={saving === 'stats'}
                      className="w-full py-5 bg-white text-gray-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-white/5 relative z-10 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      {saving === 'stats' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                          جاري المسح الضوئي...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          تحديث إحصائيات الضمانات الآن
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* FINANCE SETTINGS */}
              {activeTab === 'finance' && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                       <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-4">هيكل العمولات</h4>
                       <div className="space-y-6">
                         <div className="space-y-2">
                           <div className="flex justify-between items-center px-1">
                             <label className="text-[10px] font-black text-gray-950 uppercase tracking-widest">نسبة عمولة المنصة</label>
                             <span className="text-sm font-black text-blue-600 italic">{finance.commission}%</span>
                           </div>
                           <div className="relative">
                             <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                             <input 
                               type="number" 
                               value={finance.commission}
                               onChange={e => setFinance(p => ({...p, commission: Number(e.target.value)}))}
                               className="w-full bg-gray-50 rounded-2xl p-5 pl-12 text-sm font-black border border-transparent focus:border-blue-500 outline-none transition-all"
                             />
                           </div>
                         </div>
                         <div className="space-y-2">
                           <div className="flex justify-between items-center px-1">
                             <label className="text-[10px] font-black text-gray-950 uppercase tracking-widest">ضريبة القيمة المضافة (VAT)</label>
                             <span className="text-sm font-black text-gray-400 italic">{finance.vatRate}%</span>
                           </div>
                           <input 
                             type="number" 
                             value={finance.vatRate}
                             onChange={e => setFinance(p => ({...p, vatRate: Number(e.target.value)}))}
                             className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-black border border-transparent focus:border-blue-500 outline-none transition-all"
                           />
                         </div>
                       </div>
                    </div>

                    <div className="space-y-8">
                       <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-4">إعدادات السحب والحدود</h4>
                       <div className="space-y-6">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-950 uppercase tracking-widest px-1">الحد الأدنى للسحب (SAR)</label>
                           <div className="relative">
                             <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                             <input 
                               type="number" 
                               value={finance.minWithdraw}
                               onChange={e => setFinance(p => ({...p, minWithdraw: Number(e.target.value)}))}
                               className="w-full bg-gray-50 rounded-2xl p-5 pl-12 text-sm font-black border border-transparent focus:border-blue-500 outline-none transition-all"
                             />
                           </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-950 uppercase tracking-widest px-1">دورة التحويلات البنكية</label>
                            <select 
                              value={finance.payoutCycle}
                              onChange={e => setFinance(p => ({...p, payoutCycle: e.target.value}))}
                              className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-black border border-transparent focus:border-blue-500 outline-none cursor-pointer appearance-none"
                            >
                              <option value="daily">تحويل يومي</option>
                              <option value="weekly">أسبوعي (كل إثنين)</option>
                              <option value="monthly">شهري منتظم</option>
                            </select>
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                     <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
                     <div>
                        <p className="text-sm font-black text-blue-900 mb-1">تأثير التعديلات المالية</p>
                        <p className="text-[11px] font-bold text-blue-700 leading-relaxed opacity-70 italic">أي تغيير في نسبة العمولة سيطبق فقط على العمليات الجديدة التي تتم بعد لحظة الحفظ. العمليات القائمة والمحجوزة حالياً ستحتفظ بالنسب القديمة.</p>
                     </div>
                  </div>

                  <button 
                    onClick={() => saveSettings('finance', finance)} 
                    disabled={saving === 'finance'}
                    className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-100"
                  >
                    اعتماد السياسات المالية الجديدة
                  </button>
                </div>
              )}

              {/* SECURITY & SYSTEM */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                    <div className="divide-y divide-gray-50">
                      <div className="py-8 flex items-center justify-between gap-10">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                             <h4 className="text-base font-black text-gray-900">وضع الصيانة الكامل (Blackout)</h4>
                             {security.maintenanceMode && <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded uppercase animate-pulse">Platform Down</span>}
                          </div>
                          <p className="text-xs font-bold text-gray-400 leading-relaxed">عند التفعيل، سيتم حجب المنصة عن جميع المشترين والبائعين وإظهار رسالة صيانة مخصصة. وحدها الإدارة يمكنها الدخول.</p>
                        </div>
                        <button 
                          onClick={() => setSecurity(p => ({...p, maintenanceMode: !p.maintenanceMode}))}
                          className={`w-16 h-8 rounded-full transition-all relative shrink-0 shadow-inner ${security.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-lg ${security.maintenanceMode ? 'left-9' : 'left-1'}`} />
                        </button>
                      </div>

                      {security.maintenanceMode && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="py-6 space-y-2"
                        >
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">رسالة الصيانة للمستخدمين</label>
                           <textarea 
                             value={security.maintenanceMessage}
                             onChange={e => setSecurity(p => ({...p, maintenanceMessage: e.target.value}))}
                             placeholder="نحن نقوم بنقل خوادم المنصة لتحسين الأداء، سنعود قريباً..."
                             className="w-full bg-red-50/50 rounded-2xl p-5 text-sm font-bold border border-red-100 focus:border-red-500 outline-none transition-all min-h-[100px] text-red-900"
                           />
                        </motion.div>
                      )}

                      <div className="py-8 flex items-center justify-between gap-10">
                        <div className="flex-1">
                          <h4 className="text-base font-black text-gray-900 mb-2 italic">التحقق من الهوية (KYC)</h4>
                          <p className="text-xs font-bold text-gray-400 leading-relaxed uppercase tracking-tighter">فرض إرفاق الهوية الوطنية والسجل التجاري (للمؤسسات) كشرط أساسي لفتح أي طلبات أو تداولات مالية.</p>
                        </div>
                        <button 
                          onClick={() => setSecurity(p => ({...p, forceVerification: !p.forceVerification}))}
                          className={`w-16 h-8 rounded-full transition-all relative shrink-0 shadow-inner ${security.forceVerification ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-lg ${security.forceVerification ? 'left-9' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="py-8 flex items-center justify-between gap-10">
                        <div className="flex-1">
                          <h4 className="text-base font-black text-gray-900 mb-2 italic">طول الجلسة الآمنة (Hours)</h4>
                          <p className="text-xs font-bold text-gray-400 leading-relaxed">عدد الساعات المسموح بها لبقاء المستخدم مسجل الدخول قبل إلزامه بإعادة التوثيق.</p>
                        </div>
                        <div className="w-28 relative">
                           <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <input 
                             type="number" 
                             value={security.sessionLimit}
                             onChange={e => setSecurity(p => ({...p, sessionLimit: Number(e.target.value)}))}
                             className="w-full bg-gray-50 rounded-2xl p-5 pl-10 text-center text-sm font-black border border-transparent focus:border-blue-600 outline-none shadow-inner"
                           />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => saveSettings('security', security)} 
                      disabled={saving === 'security'}
                      className="w-full py-5 bg-gray-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-gray-300"
                    >
                      تحديث بروتوكولات النظام
                    </button>
                  </div>
                </div>
              )}

              {/* SUPPORT & SOCIAL */}
              {activeTab === 'support' && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">القنوات الرسمية</h4>
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 mr-1 italic">بريد الدعم</label>
                              <div className="relative group">
                                 <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
                                 <input 
                                   type="email" 
                                   value={support.email}
                                   onChange={e => setSupport(p => ({...p, email: e.target.value}))}
                                   className="w-full bg-gray-50 rounded-2xl p-5 pr-12 text-sm font-bold border border-transparent focus:border-purple-500 outline-none"
                                   dir="ltr"
                                 />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 mr-1 italic">رقم الواتساب</label>
                              <div className="relative group">
                                 <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                                 <input 
                                   type="text" 
                                   value={support.whatsapp}
                                   onChange={e => setSupport(p => ({...p, whatsapp: e.target.value}))}
                                   className="w-full bg-gray-50 rounded-2xl p-5 pr-12 text-sm font-bold border border-transparent focus:border-purple-500 outline-none"
                                   dir="ltr"
                                 />
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">التواجد الاجتماعي</h4>
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 mr-1 italic">Twitter (X)</label>
                              <div className="relative">
                                 <Share2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                 <input 
                                   type="text" 
                                   value={support.twitter}
                                   onChange={e => setSupport(p => ({...p, twitter: e.target.value}))}
                                   placeholder="@khyrat_farm"
                                   className="w-full bg-gray-50 rounded-2xl p-5 pr-12 text-sm font-bold border border-transparent focus:border-purple-500 outline-none"
                                   dir="ltr"
                                 />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-gray-400 mr-1 italic">Instagram</label>
                              <div className="relative">
                                 <Share2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                 <input 
                                   type="text" 
                                   value={support.instagram}
                                   onChange={e => setSupport(p => ({...p, instagram: e.target.value}))}
                                   placeholder="@khyrat_farm"
                                   className="w-full bg-gray-50 rounded-2xl p-5 pr-12 text-sm font-bold border border-transparent focus:border-purple-500 outline-none"
                                   dir="ltr"
                                 />
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">المقر الرئيسي / عنوان المراسلات</label>
                        <textarea 
                          value={support.address}
                          onChange={e => setSupport(p => ({...p, address: e.target.value}))}
                          className="w-full bg-gray-50 rounded-2xl p-5 text-sm font-bold border border-transparent focus:border-purple-500 outline-none transition-all min-h-[80px] resize-none"
                        />
                     </div>
                  </div>

                  <button 
                    onClick={() => saveSettings('support', support)} 
                    disabled={saving === 'support'}
                    className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-100"
                  >
                    حفظ الملف التعريفي وقنوات الدعم
                  </button>
                </div>
              )}

              {/* LEGAL & POLICIES */}
              {activeTab === 'legal' && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 animate-in slide-in-from-bottom-4">
                   <div className="space-y-6">
                      <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                            <ShieldCheck className="w-6 h-6 text-blue-600" />
                         </div>
                         <div>
                            <h4 className="font-black text-sm italic mb-1">الوثائق القانونية</h4>
                            <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic">هذه الروابط ستظهر في الفوتر وفي صفحات تسجيل البائعين لضمان الشفافية والموافقة الصريحة.</p>
                         </div>
                      </div>

                      <div className="space-y-6">
                         {[
                            { label: 'شروط الاستخدام (TOS)', key: 'tosLink', icon: <FileText className="w-4 h-4" /> },
                            { label: 'سياسة الخصوصية', key: 'privacyLink', icon: <Lock className="w-4 h-4" /> },
                            { label: 'سياسة الاسترجاع والضمان', key: 'refundLink', icon: <DollarSign className="w-4 h-4" /> }
                         ].map(item => (
                            <div key={item.key} className="space-y-2">
                               <label className="text-[10px] font-black text-gray-950 uppercase tracking-widest px-1 block">{item.label}</label>
                               <div className="relative group">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                     <a href={(legal as any)[item.key]} target="_blank" rel="noreferrer" className="p-1.5 bg-white rounded-lg text-gray-300 hover:text-blue-600 shadow-sm transition-all border border-gray-100">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                     </a>
                                     {item.icon}
                                  </div>
                                  <input 
                                    type="text" 
                                    value={(legal as any)[item.key]}
                                    onChange={e => setLegal(p => ({...p, [item.key]: e.target.value}))}
                                    placeholder="https://khyratfarm.com/legal/..."
                                    className="w-full bg-gray-50 rounded-2xl p-5 pl-20 text-xs font-bold border border-transparent focus:border-blue-600 outline-none transition-all"
                                    dir="ltr"
                                  />
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                   <button 
                    onClick={() => saveSettings('legal', legal)} 
                    disabled={saving === 'legal'}
                    className="w-full py-5 bg-gray-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200"
                  >
                    ربط الوثائق القانونية
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50"
          >
            <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              toast.type === 'success' 
              ? 'bg-gray-950 text-white border-white/10' 
              : 'bg-red-600 text-white border-red-500'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-black text-xs italic tracking-tight">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
