import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { 
  TrendingUp, Wallet, ShieldCheck, Clock, Activity, 
  ArrowUpRight, Users as UsersIcon, MessageSquare, 
  AlertTriangle, LayoutDashboard,
  Zap, ArrowLeftRight, FileText, Sliders, Sparkles, Server, Database,
  RefreshCw, Key, Wifi, ShieldAlert, CheckCircle2, Lock, Smartphone, Search
} from 'lucide-react';
import { format, startOfWeek, eachDayOfInterval, endOfWeek, isSameDay, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { ReportGenerator } from '../../components/admin/ReportGenerator';

export const AdminOverview: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;
  const navigate = useNavigate();
  const [searchOrderId, setSearchOrderId] = useState('');

  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [chartShape, setChartShape] = useState<'monotone' | 'linear' | 'step' | 'dashed'>('monotone');
  
  const [showReports, setShowReports] = useState(false);
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

  const [gatewayHealth, setGatewayHealth] = useState<{
    payment: {
      provider: string;
      isConfigured: boolean;
      merchantId: string;
      terminalId: string;
      baseUrl: string;
      status: 'connected' | 'degraded' | 'offline';
      latency: number;
      error: string;
      checkedAt: string;
    };
    sms: {
      provider: string;
      isConfigured: boolean;
      apiKey: string;
      senderId: string;
      baseUrl: string;
      status: 'connected' | 'degraded' | 'offline';
      latency: number;
      error: string;
      checkedAt: string;
    };
  } | null>(null);

  const [checkingGateways, setCheckingGateways] = useState(false);
  const [countdown, setCountdown] = useState(15);

  const checkGatewaysInfo = async () => {
    setCheckingGateways(true);
    try {
      const res = await fetch('/api/admin/gateway-status');
      if (res.ok) {
        const data = await res.json();
        setGatewayHealth(data);
      }
    } catch (e) {
      console.error("Failed to fetch gateway status:", e);
    } finally {
      setCheckingGateways(false);
      setCountdown(15);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    checkGatewaysInfo();

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          checkGatewaysInfo();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAdmin]);

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
  const totalDocs = stats.totalUsers + stats.allTx.length + stats.totalTickets + stats.totalReviews + stats.totalFeedback;
  const usageLimit = 50000;
  const usagePercentage = Math.min(Math.round((totalDocs / usageLimit) * 100), 100);

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
    { label: 'توثيق الحسابات المعلقة', desc: `${stats.pendingVerifications} طلب جديد تحت المراجعة`, link: '/admin/users', icon: <ShieldCheck />, color: 'blue' },
    { label: 'النزاعات والشكاوى النشطة', desc: `${stats.disputeCount} قضية معلقة تتطلب التدخل`, link: '/admin/disputes', icon: <AlertTriangle />, color: 'red' },
    { label: 'سجل التداولات المالية', desc: 'إدارة عمليات الدفع والوساطة والضمان', link: '/admin/transactions', icon: <Wallet />, color: 'green' },
    { label: 'دعم العملاء وتذاكر المساعدة', desc: `لديك ${stats.totalTickets} تذكرة دعم مسجلة بالنظام`, link: '/admin/support', icon: <MessageSquare />, color: 'purple' },
  ];

  const mainStats = [
    { 
      label: 'إجمالي حجم التداولات والمبيعات', 
      value: `${stats.totalVolume.toLocaleString()} ر.س`, 
      icon: <TrendingUp />, 
      trend: 'تحديث حي', 
      color: 'blue',
      link: '/admin/transactions',
      info: 'مجموع المبالغ المتداولة عبر صفقات المنصة بالكامل. انقر لعرض تفاصيل سجل التداولات المالي.'
    },
    { 
      label: 'صافي عوائد ورسوم المنصة', 
      value: `${stats.totalFees.toLocaleString()} ر.س`, 
      icon: <Zap />, 
      trend: 'مباشر الآن', 
      color: 'yellow',
      link: '/admin/revenue',
      info: 'الأرباح المحققة والرسوم المستقطعة كصافي دخل للمنصة. انقر لتحليل إحصائيات الأرباح.'
    },
    { 
      label: 'إجمالي المستفيدين والأعضاء', 
      value: `${stats.totalUsers.toLocaleString()} مستفيد`, 
      icon: <UsersIcon />, 
      trend: 'نمو مستقر', 
      color: 'indigo',
      link: '/admin/users',
      info: 'عدد حسابات الأعضاء والشركاء المسجلين والنشطين بالمنصة. انقر لإدارة الحسابات وتوثيق الهوية.'
    },
    { 
      label: 'الصفقات والمعاملات في الضمان', 
      value: `${stats.activeEscrows.toLocaleString()} معاملة`, 
      icon: <Clock />, 
      trend: 'بانتظار التسليم', 
      color: 'orange',
      link: '/admin/transactions',
      info: 'العمليات النشطة الجارية التي لم تسلم مبالغها للبائعين حتى إتمام الشروط وضمان الأطراف.'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 text-right" dir="rtl">
      
      {/* Dynamic Futuristic Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-gray-900 via-indigo-950 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-white border border-white/20 shadow-inner rotate-3 hover:rotate-12 transition-all duration-355 select-none text-right">
              <LayoutDashboard className="w-8 h-8 text-blue-450" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight leading-none">لوحة إدارة <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">الضمان والوساطة والتحليلات</span></h1>
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2.5">
                <div className="flex items-center gap-1.5 px-3 py-0.5 bg-green-500/20 text-green-300 rounded-full border border-green-500/30 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                  <span>كافة الخدمات متصلة</span>
                </div>
                <span className="text-white/25">•</span>
                <span className="text-gray-300 text-[11px] font-bold">قواعد بيانات النظام تعمل بأعلى كفاءة</span>
                <span className="text-white/25">•</span>
                <p className="text-gray-400 font-bold text-[10px] tracking-widest uppercase">{format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <Link to="/admin/settings" className="flex-1 lg:flex-initial text-center px-5 py-3.5 bg-white/15 text-white rounded-2xl font-bold text-[11px] hover:bg-white/25 border border-white/10 tracking-wider transition-all">
              إعدادات المنصة
            </Link>
            <button 
              onClick={() => setShowReports(true)}
              className="flex-1 lg:flex-initial px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[11px] hover:bg-blue-505 hover:scale-[1.01] active:scale-95 shadow-xl shadow-blue-900/30 transition-all flex items-center justify-center gap-2 border border-blue-500"
            >
              <FileText className="w-4 h-4" />
              تصدير التقارير المطورة
            </button>
          </div>
        </div>
      </div>

      {/* Main Upgraded KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStats.map((s, idx) => {
          const colorStyles = 
            s.color === 'blue' ? { bg: 'from-blue-50 to-indigo-50/30', text: 'text-blue-600', border: 'hover:border-blue-200', ring: 'bg-blue-600' } :
            s.color === 'yellow' ? { bg: 'from-emerald-50 to-teal-50/20', text: 'text-emerald-700', border: 'hover:border-emerald-200', ring: 'bg-emerald-600' } :
            s.color === 'indigo' ? { bg: 'from-purple-50 to-indigo-50/20', text: 'text-purple-600', border: 'hover:border-purple-200', ring: 'bg-indigo-600' } :
            { bg: 'from-amber-50 to-orange-50/20', text: 'text-amber-700', border: 'hover:border-amber-200', ring: 'bg-amber-500' };

          return (
            <Link 
              key={idx} 
              to={s.link || '#'}
              className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-xl ${colorStyles.border} transition-all duration-300 cursor-pointer flex flex-col text-right`}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10" />
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-gray-50 rounded-full group-hover:scale-150 transition-transform duration-700 opacity-40 -z-10" />
              
              <div className="relative z-10 flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${colorStyles.ring} text-white flex items-center justify-center shadow-lg shadow-gray-100 group-hover:scale-110 transition-transform duration-300`}>
                    {React.cloneElement(s.icon as React.ReactElement, { className: 'w-5 h-5' })}
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-black ${s.color === 'red' ? 'text-red-650 bg-red-50' : 'text-green-700 bg-green-50'} px-2.5 py-1 rounded-full`}>
                    <ArrowUpRight className="w-3 h-3" />
                    <span>{s.trend}</span>
                  </div>
                </div>
                
                <div className="mt-2 text-right">
                  <p className="text-gray-400 font-bold text-[10px] uppercase mb-1 tracking-widest">{s.label}</p>
                  <p className="text-xl md:text-2xl font-black text-gray-900 tabular-nums leading-tight">{s.value}</p>
                </div>
                
                {/* Info Tooltip description inside card */}
                <div className="mt-4 pt-3 border-t border-gray-100 text-right">
                  <p className="text-[10px] text-gray-400 leading-normal font-medium">{s.info}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bento Grid: Charts, Configuration & Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Growth Chart Container (2 Column Bento Block) */}
        <div className="xl:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative flex flex-col justify-between text-right">
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-50">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <h3 className="text-base md:text-lg font-black text-gray-900">مخطط حجم الحركة الاقتصادية</h3>
                  <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase">احصائيات مالية</div>
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">تتبع دورة حجم الصفقات والمبالغ المتداولة بالضمان</p>
              </div>
              
              {/* Controls Cluster */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Range Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setChartView('weekly')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${chartView === 'weekly' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    أسبوعي
                  </button>
                  <button 
                    onClick={() => setChartView('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${chartView === 'monthly' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    شهري
                  </button>
                </div>

                {/* Chart Type Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setChartType('area')}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${chartType === 'area' ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    مساحة
                  </button>
                  <button 
                    onClick={() => setChartType('bar')}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${chartType === 'bar' ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    أعمدة
                  </button>
                  <button 
                    onClick={() => setChartType('line')}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${chartType === 'line' ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    خطي
                  </button>
                </div>
              </div>
            </div>

            {/* Customizer Sub Bar */}
            <div className="bg-gray-50 p-3 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-right">
              <div className="flex items-center gap-1.5 text-gray-500 font-bold">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>نوع ونمط شكل المنحنى الرسومي:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'monotone', label: 'انسيابي ناعم' },
                  { id: 'linear', label: 'حاد هندسي' },
                  { id: 'step', label: 'متدرج خطي' },
                  { id: 'dashed', label: 'مسار منقط' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setChartShape(s.id as any)}
                    className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all ${
                      chartShape === s.id 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="h-[280px] md:h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                    dy={8}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: '900', textAlign: 'right' }}
                    formatter={(value) => [`${Number(value).toLocaleString()} ر.س`, 'المبلغ المالي المودع']}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={26} />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                    dy={8}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: '900', textAlign: 'right' }}
                    formatter={(value) => [`${Number(value).toLocaleString()} ر.س`, 'المبلغ المالي المودع']}
                  />
                  <Line 
                    type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                    strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                    dataKey="value" 
                    stroke="#2563eb" 
                    strokeWidth={4} 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              ) : (
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                    dy={8}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: '900', textAlign: 'right' }}
                    formatter={(value) => [`${Number(value).toLocaleString()} ر.س`, 'المبلغ المالي المودع']}
                  />
                  <Area 
                    type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                    strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                    dataKey="value" 
                    stroke="#2563eb" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Center & Shortcuts Bento Block */}
        <div className="flex flex-col gap-6 text-right">
          <div className="bg-gray-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl text-white flex-1 overflow-hidden relative flex flex-col justify-between border border-white/5 text-right">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            
            <div className="relative z-10 text-right">
              <div className="flex items-center gap-2 mb-6">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h3 className="text-base md:text-lg font-black tracking-tight font-bold">إجراءات المراقبة الفورية</h3>
              </div>

              <div className="space-y-3.5">
                {quickActions.map((a, i) => (
                  <Link 
                    key={i}
                    to={a.link}
                    className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 hover:border-white/15 group text-right w-full"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gray-950/80 group-hover:scale-110 transition-transform shrink-0 ${
                      a.color === 'blue' ? 'text-blue-400' : 
                      a.color === 'red' ? 'text-red-400' : 
                      a.color === 'green' ? 'text-green-400' : 
                      'text-purple-400'
                    }`}>
                      {React.cloneElement(a.icon as React.ReactElement, { className: 'w-5 h-5' })}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-[11px] font-black text-white group-hover:text-blue-200 transition-colors leading-tight">{a.label}</p>
                      <p className="text-[9px] font-bold text-gray-400 mt-1 truncate leading-none">{a.desc}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="text-right mb-4">
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1.5">البحث السريع عن طلب</p>
              <h3 className="text-base font-black text-gray-900">أدخل رقم المعرف لفتح الطلب</h3>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (searchOrderId.trim()) navigate(`/order/${searchOrderId.trim()}`); }} className="flex gap-2">
              <button type="submit" className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-md shrink-0">
                <Search className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="رقم الطلب..."
                className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-left font-mono font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </form>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="text-right">
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1.5">طلب توثيق بانتظار المراجعة</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-black text-gray-900">{stats.pendingVerifications}</span>
                <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full">بانتظار إجراء قاطع</span>
              </div>
            </div>
            <Link to="/admin/users" className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md shadow-blue-50 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </div>

      {/* Operations & Deep Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-right">
        
        {/* Recent escrow transactions list */}
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col justify-between text-right">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-50 mb-6">
              <div className="text-right">
                <h3 className="text-base md:text-lg font-black text-gray-900">سجل عمليات الضمان الأحدث</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">متابعة دقيقة وفورية لحركة المبالغ المودعة والمدفوعة</p>
              </div>
              <Link to="/admin/transactions" className="text-[10px] font-black text-blue-600 hover:text-blue-800 hover:underline transition-all uppercase tracking-widest shrink-0">
                إدارة سجلات الدفع والوساطة ←
              </Link>
            </div>
            
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {stats.recentTransactions.length > 0 ? (
                stats.recentTransactions.map((tx: any) => {
                  const isCompleted = tx.status === 'completed';
                  const isEscrowed = tx.status === 'escrowed';
                  
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 rounded-2xl transition-all border border-gray-100/50 hover:border-gray-200 group text-right">
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          isCompleted ? 'bg-green-50 text-green-755 font-bold' : 
                          isEscrowed ? 'bg-orange-50 text-orange-755 font-bold' : 
                          'bg-gray-50 text-gray-600'
                        }`}>
                          <ArrowLeftRight className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-gray-900">ID: {tx.id.slice(0, 8).toUpperCase()}</span>
                            <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black ${
                              isCompleted ? 'bg-green-105 text-green-800' :
                              isEscrowed ? 'bg-orange-105 text-orange-850' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {isCompleted ? 'معاملة مكتملة ومسددة' : isEscrowed ? 'محتجز بنظام المدفوعات' : tx.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[9px] text-gray-400 font-bold text-right">
                            <span>طريقة السداد:</span>
                            <span className="text-gray-650 font-black">{tx.paymentMethod === 'bank' || tx.paymentMethod === 'iban' ? 'حوالة بنكية مباشرة' : 'بوابة دفع مدى/فيزا'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left shrink-0">
                        <p className="text-sm font-black text-gray-900 tracking-tight">{Number(tx.amount).toLocaleString()} ر.س</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{tx.createdAt?.toDate ? format(tx.createdAt.toDate(), 'HH:mm - yyyy/MM/dd', { locale: ar }) : 'الآن'}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Activity className="w-14 h-14 text-indigo-100 mb-4 animate-bounce" />
                  <p className="text-xs text-gray-400 font-black">لا يوجد عمليات لعرضها حالياً</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Gateways & Cloud Infrastructure NOC Panel */}
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col justify-between text-right">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-50 mb-6 gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <h3 className="text-base md:text-lg font-black text-gray-900">البوابات والربط الخارجي اللحظي</h3>
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">مراقبة وفحص مفاتيح الربط وسرعة استجابة البوابات الخارجية</p>
              </div>

              {/* Automatic Countdown and Refresh trigger */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 shrink-0 select-none">
                <div className="text-[9px] font-bold text-gray-500 text-right">
                  تحديث تلقائي خلال <span className="text-blue-600 font-black tabular-nums">{countdown}</span> ث
                </div>
                <button
                  disabled={checkingGateways}
                  onClick={checkGatewaysInfo}
                  className="p-1 px-2 bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg text-[9px] font-black border border-gray-100 flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${checkingGateways ? 'animate-spin text-blue-600' : ''}`} />
                  <span>افحص الآن</span>
                </button>
              </div>
            </div>

            {/* Live Gateway Telemetry cards */}
            <div className="space-y-4 mb-6">
              
              {/* Payment Gateway: Geidea */}
              <div className="p-4 rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/20 relative overflow-hidden group">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      gatewayHealth?.payment.status === 'connected' ? 'bg-blue-50 text-blue-600' :
                      gatewayHealth?.payment.status === 'degraded' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-650'
                    }`}>
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <h4 className="text-xs font-black text-gray-900">بوابة الدفع الإلكتروني (Geidea)</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-bold truncate max-w-[210px]">{gatewayHealth?.payment.baseUrl}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Latency badge */}
                    {gatewayHealth && (
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        gatewayHealth.payment.status === 'connected' ? 'bg-blue-100 text-blue-700' :
                        gatewayHealth.payment.status === 'degraded' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-101 text-red-700'
                      }`}>
                        {gatewayHealth.payment.latency > 0 ? `${gatewayHealth.payment.latency} ms` : 'تأخر بالاتصال'}
                      </span>
                    )}
                    {/* Status Dot Ring */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                      gatewayHealth?.payment.status === 'connected' ? 'bg-green-105 text-green-850' :
                      gatewayHealth?.payment.status === 'degraded' ? 'bg-amber-105 text-amber-850' :
                      'bg-red-105 text-red-850'
                    }`}>
                      {gatewayHealth?.payment.status === 'connected' ? 'نشط ومتصل' :
                       gatewayHealth?.payment.status === 'degraded' ? 'استجابة معلقة' : 'بانتظار التهيئة'}
                    </span>
                  </div>
                </div>

                {/* Secret Key Mask Verification display */}
                <div className="mt-4 pt-3.5 border-t border-dashed border-gray-100 grid grid-cols-2 gap-3 text-[10px] text-right">
                  <div className="bg-gray-50/80 p-2 rounded-xl border border-gray-100/30">
                    <div className="flex items-center gap-1 justify-end text-gray-400 font-bold mb-0.5">
                      <span>الرقم المرجعي (Merchant ID)</span>
                      <Key className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className="font-mono text-gray-700 font-black">{gatewayHealth?.payment.merchantId}</span>
                  </div>
                  <div className="bg-gray-50/80 p-2 rounded-xl border border-gray-100/30">
                    <div className="flex items-center gap-1 justify-end text-gray-400 font-bold mb-0.5">
                      <span>رقم نقطة البيع (Terminal ID)</span>
                      <Lock className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className="font-mono text-gray-700 font-black">{gatewayHealth?.payment.terminalId}</span>
                  </div>
                </div>

                {gatewayHealth?.payment.error && (
                  <div className="mt-3 p-2 bg-red-50 text-red-650 rounded-xl text-[9px] font-bold text-right flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>تشخيص الخطأ: {gatewayHealth.payment.error}</span>
                  </div>
                )}
              </div>

              {/* SMS Gateway: Yamama SMS */}
              <div className="p-4 rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/20 relative overflow-hidden group">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      gatewayHealth?.sms.status === 'connected' ? 'bg-purple-50 text-purple-600' :
                      gatewayHealth?.sms.status === 'degraded' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-655'
                    }`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <h4 className="text-xs font-black text-gray-900">مزود خدمة الرسائل القصيرة SMS (اليمامة)</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-bold truncate max-w-[210px]">{gatewayHealth?.sms.baseUrl}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Latency badge */}
                    {gatewayHealth && (
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        gatewayHealth.sms.status === 'connected' ? 'bg-purple-100 text-purple-700' :
                        gatewayHealth.sms.status === 'degraded' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-101 text-red-700'
                      }`}>
                        {gatewayHealth.sms.latency > 0 ? `${gatewayHealth.sms.latency} ms` : 'تأخر بالاتصال'}
                      </span>
                    )}
                    {/* Status Dot Ring */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                      gatewayHealth?.sms.status === 'connected' ? 'bg-green-105 text-green-850' :
                      gatewayHealth?.sms.status === 'degraded' ? 'bg-amber-105 text-amber-850' :
                      'bg-red-105 text-red-850'
                    }`}>
                      {gatewayHealth?.sms.status === 'connected' ? 'نشط ومتصل' :
                       gatewayHealth?.sms.status === 'degraded' ? 'استجابة معلقة' : 'بانتظار التهيئة'}
                    </span>
                  </div>
                </div>

                {/* API Key Credentials Check */}
                <div className="mt-4 pt-3.5 border-t border-dashed border-gray-100 grid grid-cols-2 gap-3 text-[10px] text-right">
                  <div className="bg-gray-50/80 p-2 rounded-xl border border-gray-100/30">
                    <div className="flex items-center gap-1 justify-end text-gray-400 font-bold mb-0.5">
                      <span>مفتاح الـ API للربط (API Key)</span>
                      <Key className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className="font-mono text-gray-700 font-black">{gatewayHealth?.sms.apiKey}</span>
                  </div>
                  <div className="bg-gray-50/80 p-2 rounded-xl border border-gray-100/30">
                    <div className="flex items-center gap-1 justify-end text-gray-400 font-bold mb-0.5">
                      <span>هوية المرسل المعتمدة (Sender ID)</span>
                      <Smartphone className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className="font-sans text-gray-700 font-black">{gatewayHealth?.sms.senderId}</span>
                  </div>
                </div>

                {gatewayHealth?.sms.isConfigured ? (
                  <div className="mt-3 p-2 bg-green-50 text-green-800 rounded-xl text-[9px] font-bold text-right flex items-center gap-1.5 border border-green-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span>مفتاح الربط مستورد بنجاح من متغيرات بيئة النظام في دقيقة واحدة</span>
                  </div>
                ) : (
                  <div className="mt-3 p-2 bg-amber-50 text-amber-850 rounded-xl text-[9px] font-bold text-right flex items-center gap-1.5 border border-amber-100">
                    <ShieldAlert className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>تنبيه: بوابة رسائل اليمامة تعمل حالياً بنظام المحاكاة الذكي لعدم وجود مفتاح الربط</span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Database System Capsule */}
          <div className="p-5 bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group text-right">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
            
            <div className="relative z-10 flex items-center justify-between text-right">
              <div className="text-right">
                <div className="flex items-center gap-1.5 opacity-85 justify-end">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-blue-300">سعة القواعد والمستندات بـ Cloud Firestore</p>
                  <Server className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <p className="text-base md:text-lg font-black mt-1 tabular-nums text-right">
                  {(totalDocs * 0.00015).toFixed(4)} GB 
                  <span className="text-xs opacity-60 font-medium mr-2">({usagePercentage}%)</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-md shrink-0">
                <Database className="w-5 h-5 text-yellow-300" />
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full transition-all duration-1000" 
                  style={{ width: `${usagePercentage}%` }} 
                />
              </div>
              <div className="flex justify-between items-center text-[8.5px] text-gray-300 font-bold mt-2">
                <span>المستخدم: {totalDocs.toLocaleString()} سجل مباشر</span>
                <span>الحد التقريبي: {usageLimit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <ReportGenerator isOpen={showReports} onClose={() => setShowReports(false)} />
    </div>
  );
};
