import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../../lib/firestoreUtils';
import { 
  Percent, 
  DollarSign, 
  AlertCircle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast as hotToast } from 'sonner';

export const AdminSettingsFinance: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [finance, setFinance] = useState({ commission: 5, minWithdraw: 100, vatRate: 15, payoutCycle: 'weekly', minEscrow: 50 });

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(doc(db, 'app_settings', 'finance'), d => {
      if (d.exists()) {
        setFinance(d.data() as any);
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'app_settings/finance'));
    return () => unsub();
  }, [isAdmin]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'app_settings', 'finance'), { ...finance, updatedAt: serverTimestamp() });
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight ">السياسات <span className="text-green-600">المالية</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">التحكم في العمولات والضرائب وشروط السحب</p>
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

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-8">
             <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-4">هيكل العمولات</h4>
             <div className="space-y-6">
               <div className="space-y-2">
                 <div className="flex justify-between items-center px-1">
                   <label className="text-[10px] font-black text-gray-950 uppercase tracking-widest">نسبة عمولة المنصة</label>
                   <span className="text-sm font-black text-blue-600 ">{finance.commission}%</span>
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
                   <span className="text-sm font-black text-gray-400 ">{finance.vatRate}%</span>
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
              <p className="text-[11px] font-bold text-blue-700 leading-relaxed opacity-70 ">أي تغيير في نسبة العمولة سيطبق فقط على العمليات الجديدة التي تتم بعد لحظة الحفظ. العمليات القائمة والمحجوزة حالياً ستحتفظ بالنسب القديمة.</p>
           </div>
        </div>

        <button 
          onClick={saveSettings} 
          disabled={saving}
          className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-100 hover:scale-[1.02] active:scale-95 transition-all"
        >
          {saving ? 'جاري الحفظ...' : 'اعتماد السياسات المالية الجديدة'}
        </button>
      </div>
    </div>
  );
};
