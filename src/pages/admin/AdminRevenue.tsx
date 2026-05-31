import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  Zap, TrendingUp, BarChart3, PieChart, 
  Calendar, Download, ArrowUpRight, DollarSign,
  TrendingDown, Percent, Sparkles, Clock
} from 'lucide-react';
import { 
  format, startOfDay, subDays, startOfWeek, startOfMonth, startOfYear, eachDayOfInterval, isSameDay
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

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
    
    // Total Fees extracted
    const grossFees = filtered.reduce((acc, tx) => acc + (Number(tx.fee) || 0), 0);
    
    // Estimate electronic gateway transaction fee (Proxy: 1.5% of total captured volume)
    const totalVolume = filtered.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
    const estimatedGatewayFees = totalVolume * 0.015;
    const netFees = Math.max(grossFees - estimatedGatewayFees, 0);

    const completedCount = filtered.filter(tx => tx.status === 'completed').length;
    const pendingFees = filtered.filter(tx => tx.status === 'escrowed').reduce((acc, tx) => acc + (Number(tx.fee) || 0), 0);

    return { 
      grossFees, 
      estimatedGatewayFees,
      netFees,
      completedCount, 
      pendingFees, 
      count: filtered.length 
    };
  }, [transactions, reportRange]);

  // Recharts Bar chart data for earnings over the last 7 days
  const chartData = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    
    return days.map(day => {
      const dayName = format(day, 'EEEE', { locale: ar });
      const dayFees = transactions
        .filter(tx => isSameDay(tx.date, day) && tx.status === 'completed')
        .reduce((acc, tx) => acc + (Number(tx.fee) || 0), 0);
      const dayPendingFees = transactions
        .filter(tx => isSameDay(tx.date, day) && tx.status === 'escrowed')
        .reduce((acc, tx) => acc + (Number(tx.fee) || 0), 0);
        
      return {
        name: dayName,
        'عمولات محققة': dayFees,
        'عمولات معلقة بالضمان': dayPendingFees
      };
    });
  }, [transactions]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right font-sans" dir="rtl">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-gray-100">
         <div className="text-right">
            <div className="flex items-center gap-2 justify-start">
               <h1 className="text-3xl font-black text-gray-900 tracking-tight">إحصائيات وتحليلات <span className="text-blue-600">الأرباح والعمولات</span></h1>
               <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
            <p className="text-gray-500 font-bold text-xs mt-1">تحليل دوري وفصل هيكلي لصافي دخل المنصة ومصاريف البوابات وتوقعات الضمان المالي.</p>
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

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         
         {/* Card 1: Gross Platform Revenue */}
         <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700 -z-10" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">إجمالي عمولات الصفقات المحققة</p>
            <div className="flex items-baseline gap-2 mb-4">
               <h3 className="text-3xl font-black italic tracking-tighter text-gray-950">{stats.grossFees.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</h3>
               <span className="text-xs font-bold text-gray-400">ر.س</span>
            </div>
            <div className="flex items-center gap-2 text-green-600 font-black text-[9px] bg-green-50 w-fit px-3 py-1 rounded-lg">
               <TrendingUp className="w-3 h-3" />
               إيرادات قائمة ومباشرة
            </div>
         </div>

         {/* Card 2: Net Platform Profits */}
         <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700 -z-10" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">صافي عوائد وأرباح المنصة (التقديري)</p>
            <div className="flex items-baseline gap-2 mb-4">
               <h3 className="text-3xl font-black italic tracking-tighter text-emerald-700">{stats.netFees.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</h3>
               <span className="text-xs font-bold text-gray-400">ر.س</span>
            </div>
            <div className="text-[8px] text-gray-400 font-bold leading-normal">
              بعد خصم عمولة الربط لبوابة الدفع الإلكتروني (~1.5%).
            </div>
         </div>

         {/* Card 3: Escrow Pending Revenue */}
         <div className="bg-gray-950 p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -z-10" />
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 italic">عمولات معلقة بالضمان (Escrow Projection)</p>
            <div className="flex items-baseline gap-2 mb-4">
               <h3 className="text-3xl font-black italic tracking-tighter text-white">+{stats.pendingFees.toLocaleString()}</h3>
               <span className="text-xs font-bold text-gray-500">ر.س</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
               <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
               <span>مكاسب قادمة فور إنهاء المشترين للصفقات</span>
            </div>
         </div>
      </div>

      {/* Bento Grid: Left Growth Chart & Right Commission Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recharts Bar Chart Block */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="pb-4 border-b border-gray-50 mb-6 text-right">
            <h3 className="text-base font-black text-gray-900">مخطط نمو وتدفق عمولات المنصة</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-1">رصد يومي للعمولات التي تحولت لرصيد الحساب مقابل المعلقة بالضمان</p>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} 
                  dy={8}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: '900', textAlign: 'right' }}
                />
                <Bar dataKey="عمولات محققة" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="عمولات معلقة بالضمان" fill="#f97316" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right side: Detailed split calculation details */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between text-right space-y-6">
          <div className="pb-4 border-b border-gray-50">
            <h3 className="text-base font-black text-gray-900">حاسبة توزيع الإيرادات والرسوم</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-1">تفكيك مالي للعمولة الثابتة (3% من قيمة كل صفقة تمور)</p>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-2xl">
              <span className="text-gray-500 font-bold">رسوم صيانة الربط الإلكتروني:</span>
              <span className="font-mono font-black text-gray-900">1.5% ثابته</span>
            </div>
            
            <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-2xl">
              <span className="text-gray-500 font-bold">تكلفة بوابة الدفع الإلكتروني (المقدرة):</span>
              <span className="font-mono font-black text-red-600">
                {stats.estimatedGatewayFees.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ر.س
              </span>
            </div>

            <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <span className="text-blue-900 font-black">صافي ربح المنصة المحقق:</span>
              <span className="font-mono font-black text-blue-900">
                {stats.netFees.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ر.س
              </span>
            </div>
          </div>

          <div className="text-[9.5px] text-gray-400 bg-gray-50 p-4 rounded-xl leading-normal font-medium">
            💡 تُحسب عمولة المنصة بنسبة 3% من كامل قيمة صفقات التمور التي يتم تعميدها وتأمينها بالضمان، بهدف تغطية تكاليف الخوادم والرسائل القصيرة والمحافظة على أمان الصفقات.
          </div>
        </div>

      </div>

      {/* Breakdown List */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-black text-lg">سجل تفاصيل العمولات المستقطعة</h3>
            <span className="text-[10px] font-black text-gray-400">آخر 10 عمليات مالية</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[800px]">
               <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b">
                     <th className="px-8 py-6">تفاصيل صفقة الضمان</th>
                     <th className="px-8 py-6">إجمالي قيمة الصفقة</th>
                     <th className="px-8 py-6">النسبة المئوية للمنصة</th>
                     <th className="px-8 py-6">قيمة العمولة المستقطعة</th>
                     <th className="px-8 py-6">حالة استحقاق العمولة</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {transactions.slice(0, 10).map(tx => {
                    const isCompleted = tx.status === 'completed';
                    
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                         <td className="px-8 py-6">
                            <p className="font-black text-gray-900 text-xs">صفقة التمور رقم #{tx.orderId?.slice(0, 8).toUpperCase()}</p>
                            <p className="text-[9px] text-gray-400 font-bold mt-0.5">بواسطة المشتري: {tx.userEmail}</p>
                         </td>
                         <td className="px-8 py-6 font-bold text-gray-500 text-xs">{tx.amount} ر.س</td>
                         <td className="px-8 py-6 font-bold text-blue-600 text-xs">3% ثابتة</td>
                         <td className="px-8 py-6 font-black text-gray-900 text-sm">+{tx.fee} ر.س</td>
                         <td className="px-8 py-6">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[8.5px] font-black uppercase ${
                               isCompleted ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {isCompleted ? 'مكتملة ومستحقة' : 'معلقة بالضمان'}
                            </span>
                         </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
