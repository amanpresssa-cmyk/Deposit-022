import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  Zap, TrendingUp, BarChart3, PieChart, 
  Calendar, Download, ArrowUpRight, DollarSign
} from 'lucide-react';
import { 
  format, startOfDay, endOfDay, subDays,
  startOfWeek, startOfMonth, startOfYear, isWithinInterval
} from 'date-fns';
import { ar } from 'date-fns/locale';

export const AdminRevenue: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportRange, setReportRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    const txQ = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(txQ, (snapshot) => {
      const txs = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        date: d.data().createdAt?.toDate() || new Date()
      }));
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
      setLoading(false);
    });

    return () => unsubTx();
  }, [isAdmin]);

  const stats = useMemo(() => {
    const now = new Date();
    let rangeStart = startOfMonth(now);
    
    if (reportRange === 'daily') rangeStart = startOfDay(now);
    else if (reportRange === 'weekly') rangeStart = startOfWeek(now, { weekStartsOn: 6 });
    else if (reportRange === 'yearly') rangeStart = startOfYear(now);

    const filtered = transactions.filter(tx => tx.date >= rangeStart);
    const totalRevenue = filtered.reduce((acc, tx) => acc + (Number(tx.fee) || 0), 0);
    const completedCount = filtered.filter(tx => tx.status === 'completed').length;
    const pendingFees = filtered.filter(tx => tx.status === 'escrowed').reduce((acc, tx) => acc + (Number(tx.fee) || 0), 0);

    return { totalRevenue, completedCount, pendingFees, count: filtered.length };
  }, [transactions, reportRange]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
         <div className="text-right">
            <h1 className="text-3xl font-black text-gray-900 italic tracking-tight mb-2">إحصائيات <span className="text-blue-600">الأرباح</span></h1>
            <p className="text-gray-500 font-bold text-sm">تحليل دقيق لصافي دخل المنصة من العمولات والرسوم المستقطعة.</p>
         </div>
         
         <div className="flex bg-gray-950 p-1 rounded-2xl shadow-xl">
            {[
              { id: 'daily', label: 'يومي' },
              { id: 'weekly', label: 'أسبوعي' },
              { id: 'monthly', label: 'شهري' },
              { id: 'yearly', label: 'سنوي' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setReportRange(r.id as any)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                  reportRange === r.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">صافي الأرباح المكتملة</p>
            <div className="flex items-baseline gap-2 mb-4">
               <h3 className="text-4xl font-black italic tracking-tighter text-gray-900">{stats.totalRevenue.toLocaleString()}</h3>
               <span className="text-sm font-bold text-gray-400">ر.س</span>
            </div>
            <div className="flex items-center gap-2 text-green-600 font-black text-[10px] bg-green-50 w-fit px-3 py-1 rounded-lg">
               <TrendingUp className="w-3 h-3" />
               مباشر حالياً
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">أرباح في الضمان (Escrow)</p>
            <div className="flex items-baseline gap-2 mb-4">
               <h3 className="text-4xl font-black italic tracking-tighter text-orange-600">{stats.pendingFees.toLocaleString()}</h3>
               <span className="text-sm font-bold text-gray-400">ر.س</span>
            </div>
            <p className="text-[9px] font-bold text-gray-400 leading-relaxed italic">سيتم تحرير هذه المبالغ فور إكمال المشترين لعمليات الاستلام.</p>
         </div>

         <div className="bg-gray-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 italic">عدد العمليات الرابحة</p>
            <h3 className="text-4xl font-black italic tracking-tighter mb-4">{stats.count}</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
               <BarChart3 className="w-4 h-4" />
               نمو ثابت للمنصة
            </div>
         </div>
      </div>

      {/* Breakdown List */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-black text-lg italic tracking-tight">تفصيل العمولات <span className="text-blue-600">المستلمة</span></h3>
            <button className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
               عرض السجل الكامل
               <ArrowUpRight className="w-3 h-3" />
            </button>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
               <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b">
                     <th className="px-8 py-6">العملية</th>
                     <th className="px-8 py-6">المبلغ الإجمالي</th>
                     <th className="px-8 py-6">نسبة المنصة</th>
                     <th className="px-8 py-6">قيمة العمولة</th>
                     <th className="px-8 py-6">الحالة</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {transactions.slice(0, 10).map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                       <td className="px-8 py-6">
                          <p className="font-black text-gray-900 text-xs">طلب محجوز #{tx.orderId?.slice(0, 8)}</p>
                          <p className="text-[9px] font-bold text-gray-400 italic">بواسطة {tx.userEmail}</p>
                       </td>
                       <td className="px-8 py-6 font-bold text-gray-500 text-xs">{tx.amount} ر.س</td>
                       <td className="px-8 py-6 font-bold text-blue-600 text-xs italic">3% ثابت</td>
                       <td className="px-8 py-6 font-black text-gray-900 text-sm italic">+{tx.fee} ر.س</td>
                       <td className="px-8 py-6">
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${
                             tx.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                            {tx.status === 'completed' ? 'تم الاستحقاق' : 'معلق'}
                          </span>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
