import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ShieldCheck, Image as ImageIcon, Upload, LayoutGrid, Activity } from 'lucide-react';
import { motion } from 'motion/react';

export const AdminSettings: React.FC = () => {
  const [homeCard, setHomeCard] = useState({ imageUrl: '', quote: '', author: '' });
  const [footer, setFooter] = useState({ description: '' });
  const [announcement, setAnnouncement] = useState({ text: '', type: 'info', isActive: false, link: '' });

  useEffect(() => {
    const unsubHome = onSnapshot(doc(db, 'app_settings', 'home_card'), d => d.exists() && setHomeCard(d.data() as any));
    const unsubFooter = onSnapshot(doc(db, 'app_settings', 'footer'), d => d.exists() && setFooter(d.data() as any));
    const unsubAnn = onSnapshot(doc(db, 'app_settings', 'announcement'), d => d.exists() && setAnnouncement(d.data() as any));
    return () => { unsubHome(); unsubFooter(); unsubAnn(); };
  }, []);

  const saveSettings = async (path: string, data: any) => {
    try {
      await setDoc(doc(db, 'app_settings', path), { ...data, updatedAt: serverTimestamp() });
      alert('تم الحفظ بنجاح');
    } catch (e) { alert('فشل الحفظ'); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) return alert('الصورة كبيرة');
      const reader = new FileReader();
      reader.onloadend = () => setHomeCard(p => ({ ...p, imageUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-4xl">
      <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-black">واجهة المستخدم</h2>
        </div>
        
        <div className="space-y-6">
           <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">صورة البطاقة الرئيسية</label>
              <div className="relative h-60 bg-gray-50 rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 group">
                 {homeCard.imageUrl ? (
                    <img src={homeCard.imageUrl} className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                       <ImageIcon className="w-12 h-12 mb-2" />
                       <span className="text-xs font-bold">لم يتم اختيار صورة</span>
                    </div>
                 )}
                 <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                    <Upload className="w-8 h-8 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                 </label>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">الاقتباس</label>
                 <textarea value={homeCard.quote} onChange={e => setHomeCard(p => ({...p, quote: e.target.value}))} className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-medium border border-transparent focus:border-blue-500 outline-none transition-all" rows={3} />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">المؤلف</label>
                 <input type="text" value={homeCard.author} onChange={e => setHomeCard(p => ({...p, author: e.target.value}))} className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-medium border border-transparent focus:border-blue-500 outline-none transition-all" />
              </div>
           </div>
           <button onClick={() => saveSettings('home_card', homeCard)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-gray-800 transition-all">حفظ البطاقة الرئيسية</button>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-black">شريط الإعلان والحماية</h2>
           </div>
           <button onClick={() => setAnnouncement(p => ({...p, isActive: !p.isActive}))} className={`w-14 h-7 rounded-full transition-all relative ${announcement.isActive ? 'bg-green-500' : 'bg-gray-200'}`}>
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${announcement.isActive ? 'left-8' : 'left-1'}`} />
           </button>
        </div>

        <div className="space-y-6">
           <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">نص الإعلان العلوي</label>
              <input type="text" value={announcement.text} onChange={e => setAnnouncement(p => ({...p, text: e.target.value}))} className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-medium border border-transparent focus:border-blue-500 outline-none transition-all" />
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">النمط البصري</label>
                 <select value={announcement.type} onChange={e => setAnnouncement(p => ({...p, type: e.target.value}))} className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-medium border border-transparent focus:border-blue-500 outline-none">
                    <option value="info">هادىء (أزرق)</option>
                    <option value="urgent">تنبيه (أحمر)</option>
                    <option value="promo">عرض (بنفسجي)</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">رابط التوجيه (لينك)</label>
                 <input type="text" value={announcement.link} onChange={e => setAnnouncement(p => ({...p, link: e.target.value}))} className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-medium border border-transparent focus:border-blue-500 outline-none" dir="ltr" />
              </div>
           </div>
           <button onClick={() => saveSettings('announcement', announcement)} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">حفظ الإعلان</button>
        </div>
      </div>
    </div>
  );
};
