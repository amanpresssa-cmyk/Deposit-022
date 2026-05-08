import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  ShieldCheck, ArrowDownToLine, Landmark, 
  ExternalLink, Clock, CheckCircle2, History
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const AdminSettlements: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [feeTransfers, setFeeTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    const payoutQ = query(collection(db, 'fee_transfers'), orderBy('createdAt', 'desc'));
    const unsubPayout = onSnapshot(payoutQ, (snapshot) => {
      const payouts = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        date: d.data().receivedAt ? new Date(d.data().receivedAt) : new Date()
      }));
      setFeeTransfers(payouts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'fee_transfers');
      setLoading(false);
    });

    return () => unsubPayout();
  }, [isAdmin]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
         <div className="text-right">
            <h1 className="text-3xl font-black text-gray-900 italic tracking-tight mb-2">التسويات <span className="text-blue-600">البنكية</span></h1>
            <p className="text-gray-500 font-bold text-sm">متابعة التحويلات المالية من نظام جيديا (Geidea) إلى الحسابات البنكية للمنصة.</p>
         </div>
         <div className="flex bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 px-4 py-2 text-green-600 bg-white rounded-xl shadow-sm border border-green-100">
               <ShieldCheck className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest italic">نظام آمن ومحمي</span>
            </div>
         </div>
      </div>

      <div className="bg-gray-950 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-black/20">
         <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -mr-48 -mt-48" />
         <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-4">
               <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-blue-400 border border-white/10 backdrop-blur-md">
                  <Landmark className="w-8 h-8" />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic mb-2">إجمالي التحويلات المستلمة</p>
                  <h2 className="text-5xl font-black italic tracking-tighter">
                    {feeTransfers.reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toLocaleString()}
                    <span className="text-xl font-bold ml-3 text-gray-600">ر.س</span>
                  </h2>
               </div>
            </div>
            
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm self-start min-w-[240px]">
               <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                  <span className="text-[10px] font-black text-gray-500 italic uppercase">آخر تحويل</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               </div>
               {feeTransfers.length > 0 ? (
                 <div>
                    <p className="text-2xl font-black italic">+{feeTransfers[0].amount} ر.س</p>
                    <p className="text-[9px] font-bold text-gray-500 mt-1">{format(feeTransfers[0].date, 'dd MMMM yyyy', { locale: ar })}</p>
                 </div>
               ) : (
                 <p className="text-[10px] font-bold text-gray-500 italic">لا توجد سجلات</p>
               )}
            </div>
         </div>
      </div>

      {/* Settlement History */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-gray-50 bg-gray-50/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
               <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
               <h3 className="font-black text-lg italic tracking-tight uppercase leading-none">History <span className="text-blue-600">Record</span></h3>
               <p className="text-[10px] font-bold text-gray-400 mt-1 italic tracking-widest uppercase opacity-70">Payout Notifications</p>
            </div>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
               <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] border-b">
                     <th className="px-8 py-5">تاريخ التحويل</th>
                     <th className="px-8 py-5">رقم المرجع (Transfer ID)</th>
                     <th className="px-8 py-5">المبلغ المودع</th>
                     <th className="px-8 py-5">حالة البنك</th>
                     <th className="px-8 py-5">الإجراء</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [1, 2, 3].map(i => (
                      <tr key={i} className="animate-pulse">
                         <td colSpan={5} className="px-8 py-6"><div className="h-4 bg-gray-100 rounded-lg w-full" /></td>
                      </tr>
                    ))
                  ) : feeTransfers.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="px-8 py-20 text-center text-gray-300 font-black italic uppercase tracking-tighter opacity-50">NO SETTLEMENT RECORDS FOUND</td>
                    </tr>
                  ) : (
                    feeTransfers.map(payout => (
                      <tr key={payout.id} className="hover:bg-gray-50/70 transition-all duration-300 group">
                         <td className="px-8 py-6">
                            <p className="font-black text-gray-900 text-xs">{format(payout.date, 'yyyy/MM/dd')}</p>
                            <p className="text-[9px] font-bold text-gray-400 mt-1 italic uppercase">{format(payout.date, 'HH:mm:ss')}</p>
                         </td>
                         <td className="px-8 py-6">
                            <span className="font-mono text-[10px] font-black text-gray-400 group-hover:text-gray-900 transition-colors uppercase tracking-tighter">
                               {payout.transferId || '#UNAVAILABLE'}
                            </span>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex items-center gap-2 text-green-600 font-black text-sm italic">
                               <ArrowDownToLine className="w-4 h-4" />
                               +{payout.amount} <span className="text-[10px] opacity-60">ر.س</span>
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] bg-blue-50/50 w-fit px-3 py-1.5 rounded-xl border border-blue-100/50">
                               <CheckCircle2 className="w-3.5 h-3.5" />
                               CONFIRMED
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <button className="p-2.5 rounded-xl bg-gray-50 text-gray-300 hover:bg-blue-600 hover:text-white transition-all shadow-sm group-hover:scale-110 group-active:scale-95">
                               <ExternalLink className="w-4 h-4" />
                            </button>
                         </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
