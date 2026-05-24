import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../../lib/firestoreUtils';
import { processSignatureOrStamp, processLogoOrFavicon } from '../../../lib/imageProcessor';
import { 
  AlertCircle, 
  Trash2, 
  Upload, 
  LayoutGrid,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast as hotToast } from 'sonner';

export const AdminSettingsGeneral: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const [sigProcessing, setSigProcessing] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const [stampProcessing, setStampProcessing] = useState(false);
  const [stampError, setStampError] = useState<string | null>(null);
  const [isSigDragOver, setIsSigDragOver] = useState(false);
  const [isStampDragOver, setIsStampDragOver] = useState(false);

  const [logoProcessing, setLogoProcessing] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isLogoDragOver, setIsLogoDragOver] = useState(false);
  const [faviconProcessing, setFaviconProcessing] = useState(false);
  const [faviconError, setFaviconError] = useState<string | null>(null);
  const [isFaviconDragOver, setIsFaviconDragOver] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(doc(db, 'app_settings', 'general'), d => {
      if (d.exists()) {
        setGeneral(prev => ({ ...prev, ...d.data() }));
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/general'));
    return () => unsub();
  }, [isAdmin]);

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
      hotToast.success('تمت معالجة وتفريغ التوقيع بنجاح');
    } catch (err: any) {
      setSigError(err.message || 'فشل معالجة صورة التوقيع');
      hotToast.error('فشل في معالجة التوقيع المرفوع');
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
      hotToast.success('تمت معالجة وتفريغ الختم بنجاح');
    } catch (err: any) {
      setStampError(err.message || 'فشل معالجة صورة الختم');
      hotToast.error('فشل في معالجة الختم المرفوع');
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
      hotToast.success('تمت معالجة وتفريغ الشعار بنجاح');
    } catch (err: any) {
      setLogoError(err.message || 'فشل معالجة صورة الشعار');
      hotToast.error('فشل في معالجة الشعار المرفوع');
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
      hotToast.success('تمت معالجة وتفريغ الأيقونة بنجاح');
    } catch (err: any) {
      setFaviconError(err.message || 'فشل معالجة صورة الأيقونة');
      hotToast.error('فشل في معالجة الأيقونة المرفوعة');
    } finally {
      setFaviconProcessing(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'app_settings', 'general'), { ...general, updatedAt: serverTimestamp() });
      hotToast.success('تم حفظ الإعدادات بنجاح');
    } catch (e) {
      hotToast.error('خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-96 flex items-center justify-center text-gray-400 font-bold ">جاري تحميل الإعدادات...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto">
      {/* Header and Back Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight ">الإعدادات <span className="text-blue-600">العامة</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">تكوين البيانات الأساسية للمنصة</p>
        </div>
        <div className="flex gap-2">
          <Link 
            to="/admin/settings"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold text-[11px] transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            رجوع للإعدادات
          </Link>
          <Link 
            to="/admin"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-xl font-bold text-[11px] transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            لوحة الإدارة
          </Link>
        </div>
      </div>

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
          
          <div className="space-y-2">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">شعار المنصة الرسمي (شعار علوي)</label>
             
             {general.logoUrl ? (
               <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-2xl space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-[10px] bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full font-black">الشعار جاهز</span>
                   <button
                     type="button"
                     onClick={() => setGeneral(p => ({ ...p, logoUrl: '' }))}
                     className="text-red-500 hover:text-red-600 text-[10px] font-black flex items-center gap-1 transition-colors"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                     حذف
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
                     <span className="text-xs font-black text-gray-950 block">جاري معالجة الشعار...</span>
                   </div>
                 ) : (
                   <label htmlFor="logo-file-upload" className="cursor-pointer space-y-2 py-1 w-full block">
                     <Upload className="w-6 h-6 text-gray-400 mx-auto transition-transform hover:scale-110" />
                     <span className="text-xs font-black text-gray-700 block">اضغط لرفع الشعار أو اسحبه هنا</span>
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

          <div className="space-y-2">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">أيقونة المنصة الصغيرة (Favicon)</label>
             {general.faviconUrl ? (
               <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-2xl space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-[10px] bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full font-black">جاهزة</span>
                   <button
                     type="button"
                     onClick={() => setGeneral(p => ({ ...p, faviconUrl: '' }))}
                     className="text-red-500 hover:text-red-600 text-[10px] font-black flex items-center gap-1 transition-colors"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                     حذف
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
                     <span className="text-xs font-black text-gray-950 block">جاري المعالجة...</span>
                   </div>
                 ) : (
                   <label htmlFor="favicon-file-upload" className="cursor-pointer space-y-2 py-1 w-full block">
                     <Upload className="w-6 h-6 text-gray-400 mx-auto transition-transform hover:scale-110" />
                     <span className="text-xs font-black text-gray-700 block">اضغط لرفع الرمز أو اسحبه هنا</span>
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

          <div className="md:col-span-2 pt-6 border-t border-gray-100">
            <h4 className="text-xs font-black text-blue-600 uppercase tracking-wider mb-1">تخصيص أختام وتوقيعات التقارير الرسمية</h4>
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

          <div className="space-y-2">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">صورة التوقيع الرسمي المعتمد</label>
             {general.signatureUrl ? (
               <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-2xl space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-[10px] bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full font-black">جاهز</span>
                   <button
                     type="button"
                     onClick={() => setGeneral(p => ({ ...p, signatureUrl: '' }))}
                     className="text-red-500 hover:text-red-600 text-[10px] font-black flex items-center gap-1 transition-colors"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                     حذف
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
                     alt="الموقع المعتمد" 
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
                     <span className="text-xs font-black text-gray-950 block">جاري المعالجة...</span>
                   </div>
                 ) : (
                   <label htmlFor="signature-file-upload" className="cursor-pointer space-y-2 py-1 w-full block">
                     <Upload className="w-6 h-6 text-gray-400 mx-auto transition-transform hover:scale-110" />
                     <span className="text-xs font-black text-gray-700 block">اضغط لرفع الرمز أو إسحبه هنا</span>
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

          <div className="space-y-2">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">صورة الختم الرسمي المعتمد</label>
             {general.stampUrl ? (
               <div className="border border-gray-100 bg-gray-50/50 p-4 rounded-2xl space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-[10px] bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full font-black">جاهز</span>
                   <button
                     type="button"
                     onClick={() => setGeneral(p => ({ ...p, stampUrl: '' }))}
                     className="text-red-500 hover:text-red-600 text-[10px] font-black flex items-center gap-1 transition-colors"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                     حذف
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
                     alt="الختم" 
                     className="max-h-full max-w-full object-contain filter drop-shadow select-none transition-transform hover:scale-[1.03]"
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
                     <span className="text-xs font-black text-gray-950 block">جاري المعالجة...</span>
                   </div>
                 ) : (
                   <label htmlFor="stamp-file-upload" className="cursor-pointer space-y-2 py-1 w-full block">
                     <Upload className="w-6 h-6 text-gray-400 mx-auto transition-transform hover:scale-110" />
                     <span className="text-xs font-black text-gray-700 block">اضغط لرفع الختم أو إسحبه إلى هنا</span>
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
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block">النص الأساسي للختم</label>
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
          onClick={saveSettings} 
          disabled={saving}
          className="w-full py-5 bg-gray-950 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ إعدادات المنصة العامة'}
        </button>
      </div>
    </div>
  );
};
