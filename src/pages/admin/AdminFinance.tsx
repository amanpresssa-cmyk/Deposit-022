import React, { useEffect, useState, useMemo } from 'react';
import { 
  collection, query, orderBy, onSnapshot, doc, updateDoc, 
  serverTimestamp, increment 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  Wallet, Activity, TrendingUp, ArrowUpRight, 
  Search, Download, Calendar, ExternalLink, FileText, Clock, ShieldCheck,
  Check, X, AlertCircle, ArrowDownRight
} from 'lucide-react';
import { 
  format, subDays, startOfDay, endOfDay, 
  startOfMonth, startOfYear, isWithinInterval, eachDayOfInterval, isSameDay
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { sendNotification } from '../../lib/notificationService';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

export const AdminFinance: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [transactions, setTransactions] = useState<any[]>([]);
  const [feeTransfers, setFeeTransfers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalActionLoading, setWithdrawalActionLoading] = useState(false);
  
  // Modals & Reason State
  const [rejectingWithdrawal, setRejectingWithdrawal] = useState<any | null>(null);
  const [withdrawalRejectionReason, setWithdrawalRejectionReason] = useState('');
  
  // Filters
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [timePreset, setTimePreset] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');

  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    const txQ = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(txQ, (snapshot) => {
      const txs = snapshot.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          date: data.createdAt?.toDate() || new Date()
        };
      });
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
      setLoading(false);
    });

    const payoutQ = query(collection(db, 'fee_transfers'), orderBy('createdAt', 'desc'));
    const unsubPayout = onSnapshot(payoutQ, (snapshot) => {
      const payouts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeeTransfers(payouts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'fee_transfers');
    });

    const withdrawQ = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
    const unsubWithdraw = onSnapshot(withdrawQ, (snapshot) => {
      const wreqs = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: data.createdAt?.toDate() || new Date()
        };
      });
      setWithdrawals(wreqs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'withdrawals');
    });

    return () => {
      unsubTx();
      unsubPayout();
      unsubWithdraw();
    };
  }, [isAdmin]);

  // Apply Filters
  const filteredTx = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = tx.date;
      const fromDate = startOfDay(new Date(dateRange.from));
      const toDate = endOfDay(new Date(dateRange.to));
      
      const isInRange = isWithinInterval(txDate, { start: fromDate, end: toDate });
      const matchesSearch = 
        tx.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.orderId?.toLowerCase().includes(searchQuery.toLowerCase());
        
      return isInRange && matchesSearch;
    });
  }, [transactions, dateRange, searchQuery]);

  const stats = useMemo(() => {
    const volume = filteredTx.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
    const fees = filteredTx.reduce((acc, tx) => acc + (Number(tx.fee) || 0), 0);
    const count = filteredTx.length;
    return { volume, fees, count };
  }, [filteredTx]);

  // Interactive Recharts computation for last 7 days
  const chartData = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    
    return days.map(day => {
      const dayName = format(day, 'EEEE', { locale: ar });
      const dayTotal = transactions
        .filter(tx => isSameDay(tx.date, day))
        .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
      const dayFees = transactions
        .filter(tx => isSameDay(tx.date, day))
        .reduce((acc, tx) => acc + (Number(tx.fee) || 0), 0);
        
      return {
        name: dayName,
        'إجمالي التداولات': dayTotal,
        'عمولة المنصة': dayFees
      };
    });
  }, [transactions]);

  const handlePresetChange = (preset: typeof timePreset) => {
    setTimePreset(preset);
    const now = new Date();
    let from = now;
    
    if (preset === 'daily') from = startOfDay(now);
    else if (preset === 'weekly') from = subDays(now, 7);
    else if (preset === 'monthly') from = startOfMonth(now);
    else if (preset === 'yearly') from = startOfYear(now);
    else return;

    setDateRange({
      from: format(from, 'yyyy-MM-dd'),
      to: format(now, 'yyyy-MM-dd')
    });
  };

  // Withdrawal Action Handlers
  const handleApproveWithdrawal = async (w: any) => {
    setWithdrawalActionLoading(true);
    try {
      await updateDoc(doc(db, 'withdrawals', w.id), {
        status: 'completed',
        completedAt: serverTimestamp()
      });
      
      if (w.userId) {
        await sendNotification(
          w.userId,
          '✅ تم إيداع سحب رصيدك بالبنك',
          `لقد تمت الموافقة على طلب السحب الخاص بك بقيمة ${w.netAmount} ر.س وتم تحويلها بنجاح إلى حسابك البنكي.`,
          'payment',
          'urgent'
        );
      }
      toast.success('تمت الموافقة على السحب وتحويل الرصيد للبائع!');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تأكيد السحب المالي.');
    } finally {
      setWithdrawalActionLoading(false);
    }
  };

  const handleRejectWithdrawal = async (w: any, reason: string) => {
    if (!reason.trim()) {
      toast.error('يرجى تحديد أو كتابة سبب الرفض');
      return;
    }
    setWithdrawalActionLoading(true);
    try {
      // 1. Mark withdrawal status as rejected
      await updateDoc(doc(db, 'withdrawals', w.id), {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: serverTimestamp()
      });

      // 2. Refund the balance to user doc
      if (w.userId) {
        await updateDoc(doc(db, 'users', w.userId), {
          balance: increment(w.amount)
        });

        // 3. Send Push Notification
        await sendNotification(
          w.userId,
          '❌ رفض طلب السحب المالي',
          `تم رفض طلب سحب الرصيد بقيمة ${w.amount} ر.س لسبب: ${reason}. تم إعادة الرصيد لمحفظتك.`,
          'payment',
          'urgent'
        );
      }

      toast.success('تم رفض طلب السحب وإعادة المبلغ لمحفظة البائع بنجاح.');
      setRejectingWithdrawal(null);
      setWithdrawalRejectionReason('');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء رفض السحب.');
    } finally {
      setWithdrawalActionLoading(false);
    }
  };

  const downloadReport = () => {
    const headers = ['تاريخ', 'الطلب', 'البريد', 'المبلغ', 'العمولة', 'الحالة'];
    const rows = filteredTx.map(tx => [
      format(tx.date, 'yyyy-MM-dd HH:mm'),
      tx.orderId,
      tx.userEmail,
      tx.amount,
      tx.fee,
      tx.status === 'escrowed' ? 'محجوز' : 'مكتمل'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finance_report_${dateRange.from}_to_${dateRange.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-right font-sans" dir="rtl">
      
      {/* Header Section */}
      <div className="bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 text-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/5">
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] -mr-[300px] -mt-[300px]" />
         <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="text-right">
               <div className="flex items-center gap-3 mb-4 justify-start">
                  <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <h1 className="text-3xl md:text-5xl font-black tracking-tighter">إدارة <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">المالية المتقدمة</span></h1>
               </div>
               <p className="text-gray-400 font-bold max-w-xl text-xs md:text-sm leading-relaxed">
                  تحليل كامل للتدفقات النقدية، تتبع الأرصدة المعلقة بالضمان، وتسييل أرباح التجار والشركاء بنقرة زر واحدة.
               </p>
            </div>
            <button 
              onClick={downloadReport}
              className="flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-2xl font-black text-sm hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-black/20 shrink-0 group border border-white/10"
            >
               <span>تصدير البيانات المحددة (CSV)</span>
               <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              { label: 'إجمالي حجم التداولات والمبيعات', value: stats.volume, icon: <TrendingUp />, color: 'blue', desc: 'ضمن النطاق الزمني المحدد للمحاسبة' },
              { label: 'أرباح وعمولات المنصة المحققة', value: stats.fees, icon: <Wallet />, color: 'green', desc: 'صافي العوائد بعد تكاليف الدفع الإلكتروني' },
              { label: 'إجمالي الحركات والعمليات المالية', value: stats.count, icon: <Activity />, color: 'indigo', desc: 'عدد الحركات المالية المكتملة والمجمدة' }
            ].map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md hover:border-white/20 transition-all">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                       {s.icon}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
                 </div>
                 <p className="text-3xl font-black italic">{Number(s.value).toLocaleString()} <span className="text-xs text-gray-400">{i !== 2 ? 'ر.س' : 'حركة'}</span></p>
                 <p className="text-[9px] font-bold text-gray-500 mt-2 tracking-tight">{s.desc}</p>
              </div>
            ))}
         </div>
      </div>

      {/* Bento Grid layout: Left Chart & Right Escrow summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recharts Area Chart Block */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="pb-4 border-b border-gray-50 mb-6 text-right">
            <h3 className="text-base font-black text-gray-900">مخطط التدفق المالي الأسبوعي (Cashflow & Escrow Trend)</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">تتبع تفاعلي لحجم المبيعات اليومي وصافي عمولات المنصة</p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="feesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                <Area 
                  type="monotone" 
                  dataKey="إجمالي التداولات" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#volumeGrad)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="عمولة المنصة" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#feesGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right side: Escrow vs Payout Summary Card */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between text-right">
          <div className="pb-4 border-b border-gray-50">
            <h3 className="text-base font-black text-gray-900">موجز الأرصدة المعلقة والنشطة</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-1">توزيع حركة الأرصدة الفورية بين الحجز والجاهزية للسحب</p>
          </div>

          <div className="space-y-4 my-6">
            <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black text-orange-800 uppercase block">مبالغ مؤمنة بالضمان (Escrow)</span>
                <span className="text-xl font-mono font-black text-orange-950 mt-1 block">
                  {transactions.filter(t => t.status === 'escrowed').reduce((acc, t) => acc + (Number(t.amount) || 0), 0).toLocaleString()} ر.س
                </span>
              </div>
              <Clock className="w-8 h-8 text-orange-600 opacity-60" />
            </div>

            <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black text-green-800 uppercase block">طلبات سحب معلقة للموافقة</span>
                <span className="text-xl font-mono font-black text-green-950 mt-1 block">
                  {withdrawals.filter(w => w.status === 'pending').reduce((acc, w) => acc + (Number(w.amount) || 0), 0).toLocaleString()} ر.س
                </span>
              </div>
              <Wallet className="w-8 h-8 text-green-600 opacity-60" />
            </div>
          </div>

          <div className="text-[10px] text-gray-400 bg-gray-50 p-4.5 rounded-2xl leading-relaxed">
            💡 يتم احتجاز مبالغ الصفقات بالكامل بنظام الضمان المشفر لحين قيام المشتري بمعاينة واعتماد استلام تمور الصفقة، مما يحمي حقوق كافة الأطراف.
          </div>
        </div>

      </div>

      {/* Filters Bar */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm sticky top-4 z-20 backdrop-blur-md bg-white/90">
         <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* Search */}
            <div className="relative flex-1 w-full">
               <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="بحث برقم الطلب أو البريد الإلكتروني..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full bg-gray-50 border border-gray-150 rounded-2xl pr-12 pl-4 py-4 text-sm font-bold focus:bg-white outline-none transition-all focus:ring-2 focus:ring-blue-100"
               />
            </div>

            {/* Presets */}
            <div className="flex bg-gray-100 p-1 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
               {[
                 { id: 'daily', label: 'يومي' },
                 { id: 'weekly', label: 'أسبوعي' },
                 { id: 'monthly', label: 'شهري' },
                 { id: 'yearly', label: 'سنوي' },
                 { id: 'custom', label: 'مخصص' }
               ].map(p => (
                 <button
                   key={p.id}
                   onClick={() => handlePresetChange(p.id as any)}
                   className={`flex-1 min-w-[70px] px-4 py-2.5 text-[10px] font-black rounded-xl transition-all ${
                     timePreset === p.id ? 'bg-white text-blue-600 shadow-md font-black' : 'text-gray-500 hover:text-gray-800'
                   }`}
                 >
                   {p.label}
                 </button>
               ))}
            </div>

            {/* Custom Range */}
            {timePreset === 'custom' && (
              <div className="flex items-center gap-3 w-full lg:w-auto">
                 <div className="relative flex-1">
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="date" 
                      value={dateRange.from}
                      onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pr-10 pl-3 py-2 text-[10px] font-black outline-none"
                    />
                 </div>
                 <span className="text-gray-400 font-black text-xs">إلى</span>
                 <div className="relative flex-1">
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input 
                      type="date" 
                      value={dateRange.to}
                      onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pr-10 pl-3 py-2 text-[10px] font-black outline-none"
                    />
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Withdrawals Section (Pending & Processed Requests Console) */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                  <Wallet className="w-5 h-5 text-blue-600" />
               </div>
               <div className="text-right">
                  <h2 className="text-lg font-black text-gray-900">إدارة طلبات السحب وتسييل الأرباح</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">مراجعة طلبات تحويل أرباح بائعي التمور وتأكيد الحوالات البنكية</p>
               </div>
            </div>
            <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black">
              {withdrawals.filter(w => w.status === 'pending').length} بانتظار التحويل
            </span>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs min-w-[950px]">
               <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] border-b">
                     <th className="px-8 py-5">البائع الشريك</th>
                     <th className="px-8 py-5">المبلغ المطلوب</th>
                     <th className="px-8 py-5">نوع السحب / الرسوم</th>
                     <th className="px-8 py-5">الحساب البنكي والآيبان</th>
                     <th className="px-8 py-5">تاريخ الطلب</th>
                     <th className="px-8 py-5">الحالة الحالية</th>
                     <th className="px-8 py-5 text-center">إجراء تحويل الأرباح</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {withdrawals.length === 0 ? (
                    <tr><td colSpan={7} className="px-8 py-14 text-center text-gray-300 italic font-bold">لا توجد طلبات سحب مسجلة حالياً بالمنصة</td></tr>
                  ) : (
                    withdrawals.map(w => {
                      const isPending = w.status === 'pending';
                      const isCompleted = w.status === 'completed';
                      
                      return (
                        <tr key={w.id} className={`${w.type === 'fast_track' ? 'bg-amber-50/15' : ''} hover:bg-gray-50/70 transition-all group`}>
                           <td className="px-8 py-5">
                             <p className="font-black text-gray-800 text-xs">{w.userName || 'تاجر منصة'}</p>
                             <p className="text-[9px] text-gray-400 mt-0.5">{w.userEmail}</p>
                           </td>
                           <td className="px-8 py-5">
                              <p className="font-black text-gray-900 text-sm">{w.amount} ر.س</p>
                              <p className="text-[9px] text-emerald-600 font-bold mt-0.5">الصافي: {w.netAmount} ر.س</p>
                           </td>
                           <td className="px-8 py-5">
                              {w.type === 'fast_track' ? (
                                <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-lg text-[8.5px] font-black uppercase">عاجل (رسوم سريعة 1%)</span>
                              ) : (
                                <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-lg text-[8.5px] font-black uppercase">عادي (مجاني 1-3 أيام)</span>
                              )}
                           </td>
                           <td className="px-8 py-5">
                              <p className="font-black text-[10px] text-gray-800">{w.bankAccount}</p>
                              <p className="text-[9px] font-mono text-gray-400 tracking-wider mt-0.5">{w.iban}</p>
                           </td>
                           <td className="px-8 py-5 text-gray-400 font-bold">
                              {w.date ? format(w.date, 'yyyy/MM/dd HH:mm', { locale: ar }) : '---'}
                           </td>
                           <td className="px-8 py-5">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[8.5px] font-black uppercase ${
                                isCompleted ? 'bg-green-100 text-green-800' :
                                w.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-orange-100 text-orange-800 animate-pulse'
                              }`}>
                                {isCompleted ? 'تم التحويل والموافقة' :
                                 w.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                              </span>
                              {w.rejectionReason && (
                                <p className="text-[8.5px] text-red-500 font-bold mt-1">السبب: {w.rejectionReason}</p>
                              )}
                           </td>
                           <td className="px-8 py-5 text-center">
                              {isPending ? (
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => handleApproveWithdrawal(w)}
                                    disabled={withdrawalActionLoading}
                                    className="py-2 px-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black hover:bg-emerald-700 shadow-md shadow-emerald-700/10 flex items-center gap-1 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>تحويل وتأكيد</span>
                                  </button>
                                  <button
                                    onClick={() => setRejectingWithdrawal(w)}
                                    disabled={withdrawalActionLoading}
                                    className="py-2 px-3.5 bg-red-50 text-red-655 border border-red-100 rounded-xl text-[10px] font-black hover:bg-red-100 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                                    title="رفض طلب السحب"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-bold select-none">---</span>
                              )}
                           </td>
                        </tr>
                      );
                    })
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                  <FileText className="w-5 h-5 text-blue-600" />
               </div>
               <div className="text-right">
                  <h2 className="text-lg font-black text-gray-900">سجل صفقات التداول المالي</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">متابعة كافة صفقات تداول التمور والمدفوعات والمستندات المالية</p>
               </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black">
               <Clock className="w-3 h-3 animate-spin" />
               تحديث فوري نشط
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[900px]">
               <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase tracking-[0.2em] border-b">
                     <th className="px-8 py-6">التوقيت</th>
                     <th className="px-8 py-6">المستفيد</th>
                     <th className="px-8 py-6">رقم الطلب</th>
                     <th className="px-8 py-6">المبلغ الإجمالي</th>
                     <th className="px-8 py-6">رسوم المنصة</th>
                     <th className="px-8 py-6">الحالة المالية</th>
                     <th className="px-8 py-6">عرض التفاصيل</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    [1, 2, 3, 4].map(i => (
                      <tr key={i} className="animate-pulse">
                         <td colSpan={7} className="px-8 py-6"><div className="h-4 bg-gray-100 rounded-lg w-full" /></td>
                      </tr>
                    ))
                  ) : filteredTx.length === 0 ? (
                    <tr>
                       <td colSpan={7} className="px-8 py-20 text-center">
                          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                             <Search className="w-10 h-10 text-gray-200" />
                          </div>
                          <p className="text-gray-400 font-bold italic">لا توجد عمليات تطابق معايير التداول المالية حالياً</p>
                       </td>
                    </tr>
                  ) : (
                    filteredTx.map(tx => {
                      const isCompleted = tx.status === 'completed';
                      const isEscrowed = tx.status === 'escrowed';
                      
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/80 transition-all duration-300 group">
                           <td className="px-8 py-6">
                              <p className="font-black text-gray-900 text-xs">{format(tx.date, 'yyyy/MM/dd')}</p>
                              <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase italic">{format(tx.date, 'HH:mm:ss')}</p>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px] uppercase">
                                    {tx.userEmail?.charAt(0)}
                                 </div>
                                 <div>
                                    <p className="font-black text-gray-900 text-xs">{tx.userEmail?.split('@')[0]}</p>
                                    <p className="text-[9px] text-gray-400 mt-0.5">{tx.userEmail}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <div className="px-3 py-1 bg-gray-100 rounded-lg text-[9px] font-mono font-black text-gray-500 tracking-tighter uppercase inline-block">
                                 #{tx.orderId?.slice(0, 8)}
                              </div>
                           </td>
                           <td className="px-8 py-6 font-black text-gray-900 text-sm">
                              {Number(tx.amount).toLocaleString()} <span className="text-[10px] text-gray-400">ر.س</span>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-2 text-green-600 font-black text-xs italic">
                                 <ArrowUpRight className="w-3 h-3" />
                                 {Number(tx.fee || 0).toLocaleString()} <span className="text-[9px] opacity-60">ر.س</span>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                 isEscrowed 
                                 ? 'bg-orange-50 text-orange-600 border border-orange-100/50' 
                                 : 'bg-green-50 text-green-600 border border-green-100/50'
                              }`}>
                                 {isEscrowed ? 'محجوز بالضمان' : isCompleted ? 'مكتمل ومسدد للبائع' : tx.status}
                              </span>
                           </td>
                           <td className="px-8 py-6">
                              <Link 
                                to={`/order/${tx.orderId}`}
                                className="w-8 h-8 rounded-lg bg-gray-105 text-gray-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm group-hover:scale-110"
                              >
                                 <ExternalLink className="w-4 h-4" />
                              </Link>
                           </td>
                        </tr>
                      );
                    })
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Payment Gateway Payouts Section (Payout History) */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
         <div className="p-6 border-b border-gray-50 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-black">إشعارات التسويات البنكية التلقائية (Payouts)</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
               <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b">
                     <th className="px-8 py-4">رقم التحويل البنكي للتسوية</th>
                     <th className="px-8 py-4">المبلغ المستلم للحساب</th>
                     <th className="px-8 py-4">الحالة البنكية</th>
                     <th className="px-8 py-4">التوقيت التاريخي</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {feeTransfers.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-10 text-center text-gray-300 italic font-bold">لا توجد سجلات تسوية مسجلة بنظام جينيا حالياً</td></tr>
                  ) : (
                    feeTransfers.map(payout => (
                       <tr key={payout.id}>
                          <td className="px-8 py-4 font-mono font-black text-[9.5px] text-gray-500">{payout.transferId}</td>
                          <td className="px-8 py-4 font-black text-gray-800">+{payout.amount} ر.س</td>
                          <td className="px-8 py-4"><span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">مكتمل ومسوى</span></td>
                          <td className="px-8 py-4 text-gray-400 font-bold">{payout.receivedAt ? format(new Date(payout.receivedAt), 'yyyy/MM/dd HH:mm', { locale: ar }) : '---'}</td>
                       </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Rejection Modal for Withdrawals */}
      {rejectingWithdrawal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="text-center">
                 <div className="w-12 h-12 bg-red-50 text-red-655 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                 </div>
                 <h3 className="text-base font-black text-gray-900">سبب رفض تسييل الرصيد</h3>
                 <p className="text-gray-400 font-medium text-xs mt-1">يرجى توضيح سبب رفض السحب ليظهر للبائع فوراً في محفظته</p>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-2">
                 {[
                   'الحساب البنكي/الآيبان غير صحيح',
                   'اسم المستفيد المرفق لا يطابق البنك',
                   'تم تعليق المعاملة مؤقتاً لمراجعة الضمان',
                   'الحساب البنكي مغلق أو غير نشط حالياً',
                 ].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setWithdrawalRejectionReason(reason)}
                      className="px-2.5 py-1 bg-red-50/50 text-red-600 rounded-lg text-[9px] font-black hover:bg-red-100 transition-all border border-red-100/30"
                    >
                      {reason}
                    </button>
                 ))}
              </div>
              <textarea 
                value={withdrawalRejectionReason}
                onChange={(e) => setWithdrawalRejectionReason(e.target.value)}
                rows={3}
                className="w-full bg-gray-50 border border-gray-150 rounded-xl p-3 focus:ring-2 focus:ring-red-100 outline-none transition-all text-xs font-medium text-right"
                placeholder="اكتب تفاصيل إضافية هنا..."
              />
              <div className="flex gap-3">
                 <button 
                   onClick={() => handleRejectWithdrawal(rejectingWithdrawal, withdrawalRejectionReason)}
                   disabled={withdrawalActionLoading}
                   className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50"
                 >
                   تأكيد الرفض والإرجاع
                 </button>
                 <button 
                   onClick={() => { setRejectingWithdrawal(null); setWithdrawalRejectionReason(''); }}
                   className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200 transition-all"
                 >
                   إلغاء
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
