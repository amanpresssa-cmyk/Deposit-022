import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  TrendingUp, Wallet, ShieldCheck, Clock, Activity, 
  ArrowUpRight, Users as UsersIcon, MessageSquare, 
  AlertTriangle, CheckCircle2, LayoutDashboard,
  Zap, ArrowLeftRight
} from 'lucide-react';
import { format, startOfWeek, eachDayOfInterval, endOfWeek, isSameDay, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import { Link } from 'react-router-dom';

export const AdminOverview: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');
  const [stats, setStats] = useState({
    totalVolume: 0,
    totalFees: 0,
    activeEscrows: 0,
    pendingVerifications: 0,
    totalUsers: 0,
    totalTickets: 0,
    totalReviews: 0,
    totalFeedback: 0,
    recentTransactions: [] as any[],
    chartData: [] as { name: string, value: number }[],
    allTx: [] as any[], // Keep all transactions to re-calculate chart locally
    disputeCount: 0,
    systemStatus: 'connected' as 'connected' | 'degraded' | 'offline',
    lastActivity: new Date()
  });

  useEffect(() => {
    if (!isAdmin) return;

    // Tx Stats
    const txQ = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(txQ, (snapshot) => {
      const allTx = snapshot.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          date: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        };
      });

      const volume = allTx.reduce((acc, tx: any) => acc + (Number(tx.amount) || 0), 0);
      const fees = allTx.reduce((acc, tx: any) => acc + (Number(tx.fee) || 0), 0);
      const active = allTx.filter((tx: any) => tx.status === 'escrowed').length;

      setStats(prev => ({ 
        ...prev, 
        totalVolume: volume, 
        totalFees: fees, 
        activeEscrows: active,
        recentTransactions: allTx.slice(0, 10),
        allTx: allTx,
        lastActivity: new Date(),
        systemStatus: 'connected'
      }));
    }, (error) => {
      setStats(prev => ({ ...prev, systemStatus: 'degraded' }));
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });

    // User Stats
    const userQ = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(userQ, (snapshot) => {
      const all = snapshot.docs.map(d => d.data());
      setStats(prev => ({ 
        ...prev, 
        totalUsers: all.length,
        pendingVerifications: all.filter(u => u.verificationStatus === 'pending').length 
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    // Reviews count
    const reviewsQ = collection(db, 'reviews');
    const unsubReviews = onSnapshot(reviewsQ, (snapshot) => {
      setStats(prev => ({ ...prev, totalReviews: snapshot.size }));
    });

    // Feedback count
    const feedbackQ = collection(db, 'platform_feedback');
    const unsubFeedback = onSnapshot(feedbackQ, (snapshot) => {
      setStats(prev => ({ ...prev, totalFeedback: snapshot.size }));
    });

    // Support Tickets count for space estimation
    const ticketsQ = query(collection(db, 'support_tickets'));
    const unsubTickets = onSnapshot(ticketsQ, (snapshot) => {
      setStats(prev => ({ ...prev, totalTickets: snapshot.size }));
    });

    // Disputes
    const disputeQ = collection(db, 'disputes');
    const unsubDisputes = onSnapshot(disputeQ, (snapshot) => {
      setStats(prev => ({ ...prev, disputeCount: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'disputes');
    });

    return () => {
      unsubTx();
      unsubUsers();
      unsubDisputes();
      unsubTickets();
      unsubReviews();
      unsubFeedback();
    };
  }, [isAdmin]);

  // Calculate System Usage Percentage (Proxy for Used Space)
  // Assuming a free-tier limit of 50,000 documents total for major collections
  const totalDocs = stats.totalUsers + stats.allTx.length + stats.totalTickets + stats.totalReviews + stats.totalFeedback;
  const usageLimit = 50000;
  const usagePercentage = Math.min(Math.round((totalDocs / usageLimit) * 100), 100);
  const usedSpaceGB = (totalDocs * 0.00015).toFixed(2); // Increased multiplier to reflect more collections

  useEffect(() => {
    if (stats.allTx.length === 0) return;

    const now = new Date();
    let computedData: { name: string, value: number }[] = [];

    if (chartView === 'weekly') {
      const start = startOfWeek(now, { weekStartsOn: 6 });
      const end = endOfWeek(now, { weekStartsOn: 6 });
      const days = eachDayOfInterval({ start, end });

      computedData = days.map(day => {
        const dayName = format(day, 'EEEE', { locale: ar });
        const dayTotal = stats.allTx
          .filter(tx => isSameDay(tx.date, day))
          .reduce((acc, tx: any) => acc + (Number(tx.amount) || 0), 0);
        
        return { name: dayName, value: dayTotal };
      });
    } else {
      // Monthly view
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const weeks = eachWeekOfInterval({ start, end });

      computedData = weeks.map((weekStart, idx) => {
        const weekEnd = endOfWeek(weekStart);
        const weekName = `الأسبوع ${idx + 1}`;
        const weekTotal = stats.allTx
          .filter(tx => tx.date >= weekStart && tx.date <= weekEnd)
          .reduce((acc, tx: any) => acc + (Number(tx.amount) || 0), 0);
        
        return { name: weekName, value: weekTotal };
      });
    }

    setStats(prev => ({ ...prev, chartData: computedData }));
  }, [chartView, stats.allTx]);

  const quickActions = [
    { label: 'توثيق الحسابات', desc: `${stats.pendingVerifications} طلب جديد`, link: '/admin/users', icon: <ShieldCheck />, color: 'blue' },
    { label: 'النزاعات النشطة', desc: `${stats.disputeCount} قضية معلقة`, link: '/admin/disputes', icon: <AlertTriangle />, color: 'red' },
    { label: 'سجل التداولات', desc: 'إدارة العمليات المالية', link: '/admin/transactions', icon: <Wallet />, color: 'green' },
    { label: 'دعم العملاء', desc: 'تذاكر المساعدة', link: '/admin/support', icon: <MessageSquare />, color: 'purple' },
  ];

  const mainStats = [
    { 
      label: 'إجمالي التداولات', 
      value: `${stats.totalVolume.toLocaleString()} ر.س`, 
      icon: <TrendingUp />, 
      trend: 'مباشر', 
      color: 'blue',
      link: '/admin/transactions',
      info: 'مجموع المبالغ المتداولة عبر المنصة. انقر لعرض سجل التداولات المالي المفصل.'
    },
    { 
      label: 'صافي أرباح العمولات', 
      value: `${stats.totalFees.toLocaleString()} ر.س`, 
      icon: <Zap />, 
      trend: 'مباشر', 
      color: 'yellow',
      link: '/admin/revenue',
      info: 'حصيلة الرسوم المستقطعة كأرباح للمنصة. انقر لتحليل إحصائيات الدخل والأرباح.'
    },
    { 
      label: 'المستخدمين النشطين', 
      value: stats.totalUsers, 
      icon: <UsersIcon />, 
      trend: 'مباشر', 
      color: 'indigo',
      link: '/admin/users',
      info: 'عدد الحسابات المسجلة والفعالة حالياً في النظام. انقر لإدارة الأعضاء.'
    },
    { 
      label: 'العمليات في الضمان', 
      value: stats.activeEscrows, 
      icon: <Clock />, 
      trend: 'مباشر', 
      color: 'orange',
      link: '/admin/orders',
      info: 'عدد العمليات الجارية التي لم تسلم مبالغها للبائعين بعد. انقر لمتابعة حالة الطلبات.'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-100 rotate-3">
              <LayoutDashboard className="w-8 h-8" />
           </div>
           <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight italic">لوحة <span className="text-blue-600">القائد</span></h1>
              <div className="flex items-center gap-3 mt-1.5">
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-green-600 font-bold text-[9px] uppercase tracking-wider">النظام يعمل بكفاءة</span>
                 </div>
                 <span className="text-gray-300">|</span>
                 <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">{format(new Date(), 'EEEE، d MMMM', { locale: ar })}</p>
              </div>
           </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
           <Link to="/admin/settings" className="px-5 py-3 bg-gray-50 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100">إعدادات النظام</Link>
           <button 
             onClick={() => window.print()}
             className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
           >
             تصدير واجهة العرض
           </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {mainStats.map((s, idx) => (
          <Link 
            key={idx} 
            to={s.link || '#'}
            className="bg-white p-3 md:p-6 rounded-2xl md:rounded-3xl border border-gray-50 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500 cursor-help flex flex-col"
          >
             <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-[0.02] transition-opacity" />
             <div className="absolute -top-12 -right-12 w-32 h-32 bg-gray-50 rounded-full group-hover:scale-150 transition-transform duration-700 opacity-50" />
             <div className="relative z-10 flex-1">
                <div className="flex justify-between items-start mb-3 md:mb-4">
                   <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gray-950 text-white flex items-center justify-center shadow-lg shadow-gray-100 group-hover:bg-blue-600 transition-colors">
                      {React.cloneElement(s.icon as React.ReactElement, { className: 'w-4 h-4 md:w-5 md:h-5' })}
                   </div>
                   <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-black text-green-600 bg-green-50/50 px-2 py-1 rounded-lg">
                      <ArrowUpRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      {s.trend}
                   </div>
                </div>
                <div>
                   <p className="text-gray-400 font-bold text-[8px] md:text-[10px] uppercase mb-0.5 md:mb-1 tracking-wider md:tracking-widest">{s.label}</p>
                   <p className="text-lg md:text-2xl font-black text-gray-900 tabular-nums leading-tight">{s.value}</p>
                </div>
                
                {/* Info Tooltip Overlay (Hidden on small mobile) */}
                <div className="mt-4 pt-4 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
                   <p className="text-[9px] font-black text-gray-400 leading-relaxed italic">{s.info}</p>
                </div>
             </div>
          </Link>
        ))}
      </div>


      {/* Charts & Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
         {/* Growth Chart */}
         <div className="xl:col-span-2 bg-white p-3 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-50 shadow-sm group relative">
            <div className="flex items-center justify-between mb-4 md:mb-8">
               <div>
                  <h3 className="text-xs md:text-lg font-black text-gray-900 italic">مخطط <span className="text-blue-600">النمو</span></h3>
                  <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">إجمالي حجم التداولات المالي</p>
               </div>
               
               {/* Hover Explanation Overlay */}
               <div className="absolute top-24 right-8 left-8 bg-gray-950/95 p-6 rounded-2xl text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-center shadow-2xl">
                  يوضح هذا المخطط حركة التدفقات المالية (المبيعات) عبر المنصة، مما يساعد في تتبع مستوى النشاط الاقتصادي وتحديد اتجاهات السوق.
               </div>
               <div className="flex bg-gray-50 p-0.5 md:p-1 rounded-lg md:rounded-xl">
                  <button 
                    onClick={() => setChartView('weekly')}
                    className={`px-2 md:px-4 py-1 md:py-1.5 rounded-md md:rounded-lg text-[7px] md:text-[9px] font-black transition-all ${chartView === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    أسبوعي
                  </button>
                  <button 
                    onClick={() => setChartView('monthly')}
                    className={`px-2 md:px-4 py-1 md:py-1.5 rounded-md md:rounded-lg text-[7px] md:text-[9px] font-black transition-all ${chartView === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    شهري
                  </button>
               </div>
            </div>
            
            <div className="h-[140px] md:h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData}>
                     <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                        dy={10}
                     />
                     <YAxis hide />
                     <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: '900' }}
                        cursor={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '5 5' }}
                     />
                     <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#2563eb" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                     />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Quick Actions Card */}
         <div className="flex flex-col gap-6">
            <div className="bg-gray-950 p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200 text-white flex-1 overflow-hidden relative">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
               <div className="relative z-10">
                  <h3 className="text-lg font-black italic mb-6">إجراءات <span className="text-blue-400">سريعة</span></h3>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                     {quickActions.map((a, i) => (
                        <Link 
                           key={i}
                           to={a.link}
                           className="flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-4 p-3 md:p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-white/10 group text-center md:text-right"
                        >
                           <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center bg-gray-900 group-hover:scale-110 transition-transform shrink-0 ${a.color === 'blue' ? 'text-blue-400' : a.color === 'red' ? 'text-red-400' : a.color === 'green' ? 'text-green-400' : 'text-purple-400'}`}>
                              {React.cloneElement(a.icon as React.ReactElement, { className: 'w-4 h-4 md:w-5 md:h-5' })}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] md:text-[11px] font-black truncate">{a.label}</p>
                              <p className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest truncate">{a.desc}</p>
                           </div>
                           <ArrowUpRight className="hidden md:block w-4 h-4 text-gray-700 group-hover:text-white transition-colors" />
                        </Link>
                     ))}
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">حالة التوثيق</p>
                  <p className="text-2xl font-black text-gray-900">{stats.pendingVerifications}</p>
               </div>
               <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center animate-bounce">
                  <ShieldCheck className="w-6 h-6" />
               </div>
            </div>
         </div>
      </div>

      {/* Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Recent Activity */}
         <div className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-sm">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-black text-gray-900 italic">آخر <span className="text-blue-600">العمليات</span></h3>
               <Link to="/admin/finance" className="text-[10px] font-black text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest">عرض الكل</Link>
            </div>
            
            <div className="space-y-4">
               {stats.recentTransactions.length > 0 ? (
                 stats.recentTransactions.map((tx: any) => (
                   <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                            <ArrowLeftRight className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="text-xs font-black text-gray-900">عملية {tx.status === 'completed' ? 'ناجحة' : 'قيد الضمان'}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase">ID: {tx.id.slice(0, 8)}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-xs font-black text-gray-900">{tx.amount} ر.س</p>
                         <p className="text-[9px] text-gray-400 font-bold uppercase">{tx.createdAt?.toDate ? format(tx.createdAt.toDate(), 'HH:mm') : 'الآن'}</p>
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Activity className="w-12 h-12 text-gray-100 mb-4" />
                    <p className="text-xs text-gray-400 font-bold">لا يوجد عمليات لعرضها حالياً</p>
                 </div>
               )}
            </div>
         </div>

         {/* System Health / Logs */}
          <div className="bg-white rounded-2xl md:rounded-[2.5rem] p-3 md:p-8 border border-gray-50 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4 md:mb-6">
               <h3 className="text-xs md:text-lg font-black text-gray-900 italic">نبض <span className="text-blue-600">النظام</span></h3>
               <Link to="/admin/logs" className="text-[8px] md:text-[10px] font-black text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest">سجلات النظام</Link>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-8">
               <div className="p-2 md:p-5 bg-gray-50 rounded-xl md:rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center">
                  <Activity className="w-3 h-3 md:w-6 md:h-6 text-blue-600 mb-1 md:mb-2" />
                  <p className="text-[6px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">نشاط الخادم</p>
                  <p className="text-[10px] md:text-lg font-black text-gray-900">{stats.recentTransactions.length > 5 ? 'مرتفع' : 'مستقر'}</p>
               </div>
               <div className="p-2 md:p-5 bg-gray-50 rounded-xl md:rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center">
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full mb-1 md:mb-3 animate-pulse ${stats.systemStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <p className="text-[6px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">حالة القواعد</p>
                  <p className={`text-[10px] md:text-lg font-black uppercase ${stats.systemStatus === 'connected' ? 'text-green-600' : 'text-orange-600'}`}>
                     {stats.systemStatus === 'connected' ? 'متصل' : 'مستقر'}
                  </p>
               </div>
            </div>

            <div className="mt-auto p-3 md:p-6 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl md:rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-16 h-16 md:w-32 md:h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 md:-mr-16 md:-mt-16" />
               <div className="relative z-10 flex items-center justify-between">
                  <div>
                     <p className="text-[6px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 md:mb-1 opacity-70 italic">مستوى الاستهلاك</p>
                     <p className="text-xs md:text-2xl font-black">{((stats.totalUsers + stats.allTx.length + stats.totalTickets + stats.totalReviews + stats.totalFeedback) * 0.00015).toFixed(2)} GB <span className="text-[8px] md:text-[10px] opacity-60">({Math.min(Math.round(((stats.totalUsers + stats.allTx.length + stats.totalTickets + stats.totalReviews + stats.totalFeedback) / 50000) * 100), 100)}%)</span></p>
                  </div>
                  <div className="w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 backdrop-blur-md">
                     <Zap className="w-4 h-4 md:w-7 md:h-7" />
                  </div>
               </div>
               <div className="mt-2 md:mt-4 w-full h-1 md:h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(Math.round(((stats.totalUsers + stats.allTx.length + stats.totalTickets + stats.totalReviews + stats.totalFeedback) / 50000) * 100), 100)}%` }} />
               </div>
               
               {/* Explanation Overlay */}
               <div className="absolute inset-0 bg-gray-950/95 flex items-center justify-center p-6 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-[10px] font-bold leading-relaxed pr-2">يمثل هذا المؤشر مقدار البيانات الحقيقية المخزنة حالياً (مستخدمين، عمليات، تذاكر) مقارنة بالسعة الإجمالية المخصصة لقواعد بياناتك.</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
