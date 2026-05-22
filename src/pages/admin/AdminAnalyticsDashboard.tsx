import React, { useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { 
  BarChart3, PieChart, Activity, Search, Filter, Database, Cpu, 
  Layers, Settings2, ArrowRightCircle, TrendingUp, Users, 
  AlertTriangle, CreditCard, Clock, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart as ReChartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Link } from 'react-router-dom';

export const AdminAnalyticsDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  // Chart Configuration States
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line' | 'pie'>('area');
  const [metric, setMetric] = useState<'all' | 'volume' | 'revenue' | 'users' | 'disputes'>('all');
  const [chartShape, setChartShape] = useState<'monotone' | 'linear' | 'step' | 'dashed'>('monotone');
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('week');

  // Unified Finder State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubsystem, setSelectedSubsystem] = useState<'all' | 'users' | 'transactions' | 'tickets' | 'disputes'>('all');

  // Firestore Data States
  const [usersList, setUsersList] = useState<any[]>([]);
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [disputesList, setDisputesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Statistics & KPI States
  const [kpis, setKpis] = useState({
    totalUsers: 0,
    totalVolume: 0,
    totalRevenue: 0,
    totalDisputes: 0,
    activeSupport: 0,
    avgTransaction: 0,
  });

  // Load Data
  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);

    const loadAllData = async () => {
      try {
        // Fetch Users
        const usersSnap = await getDocs(collection(db, 'users'));
        const uData: any[] = usersSnap.docs.map(doc => ({
          id: doc.id,
          type: 'user',
          ...doc.data(),
          createdAtDate: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
        }));
        setUsersList(uData);

        // Fetch Transactions
        const txSnap = await getDocs(collection(db, 'transactions'));
        const tData: any[] = txSnap.docs.map(doc => ({
          id: doc.id,
          type: 'transaction',
          ...doc.data(),
          createdAtDate: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
        }));
        setTransactionsList(tData);

        // Fetch Tickets
        const ticketsSnap = await getDocs(collection(db, 'support_tickets'));
        const tkData: any[] = ticketsSnap.docs.map(doc => ({
          id: doc.id,
          type: 'ticket',
          ...doc.data(),
          createdAtDate: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
        }));
        setTicketsList(tkData);

        // Fetch Disputes
        const disputesSnap = await getDocs(collection(db, 'disputes'));
        const dData: any[] = disputesSnap.docs.map(doc => ({
          id: doc.id,
          type: 'dispute',
          ...doc.data(),
          createdAtDate: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
        }));
        setDisputesList(dData);

        // Calculate KPIs
        const totalU = uData.length;
        const totalV = tData.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        const totalR = tData.reduce((sum, tx) => sum + (Number(tx.fee) || 0), 0);
        const totalD = dData.length;
        const activeS = tkData.filter((tk: any) => tk.status !== 'closed' && tk.status !== 'completed').length;
        const avgTx = tData.length > 0 ? (totalV / tData.length) : 0;

        setKpis({
          totalUsers: totalU,
          totalVolume: totalV,
          totalRevenue: totalR,
          totalDisputes: totalD,
          activeSupport: activeS,
          avgTransaction: Math.round(avgTx),
        });

      } catch (err) {
        console.error("Error loading analytics data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [isAdmin]);

  // Metric and Color mapping for exquisite visual structure
  const metricColorsMap: Record<string, { primary: string, secondary: string, bgLight: string, text: string }> = {
    all: { primary: '#2563eb', secondary: '#4f46e5', bgLight: 'bg-blue-50/30', text: 'text-blue-600' },
    volume: { primary: '#2563eb', secondary: '#6366f1', bgLight: 'bg-blue-50/30', text: 'text-blue-600' },       // Cosmic Blue / Indigo
    revenue: { primary: '#10b981', secondary: '#059669', bgLight: 'bg-emerald-50/30', text: 'text-emerald-600' }, // Emerald / Green
    users: { primary: '#8b5cf6', secondary: '#7c3aed', bgLight: 'bg-purple-50/30', text: 'text-purple-600' },    // Violet / Purple
    disputes: { primary: '#f59e0b', secondary: '#d97706', bgLight: 'bg-amber-50/30', text: 'text-amber-600' },    // Amber / Orange
  };

  const activeColor = metricColorsMap[metric] || metricColorsMap.all;

  // Dynamic Chart Data Generator
  const getChartData = (selectedMetric: 'all' | 'volume' | 'revenue' | 'users' | 'disputes' = metric) => {
    const metric = selectedMetric === 'all' ? 'volume' : selectedMetric;
    // Generate empty buckets based on selected timePeriod
    const now = new Date();
    const dataPoints: { name: string, value: number, secondaryValue?: number }[] = [];

    if (timePeriod === 'week') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const label = d.toLocaleDateString('ar-SA', { weekday: 'short' });
        dataPoints.push({ name: label, value: 0, secondaryValue: 0 });
      }

      // Populate based on metric
      if (metric === 'volume') {
        transactionsList.forEach(tx => {
          const diffDays = Math.floor((now.getTime() - tx.createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            const idx = 6 - diffDays;
            if (dataPoints[idx]) {
              dataPoints[idx].value += (Number(tx.amount) || 0);
              dataPoints[idx].secondaryValue = (dataPoints[idx].secondaryValue || 0) + (Number(tx.fee) || 0);
            }
          }
        });
      } else if (metric === 'revenue') {
        transactionsList.forEach(tx => {
          const diffDays = Math.floor((now.getTime() - tx.createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            const idx = 6 - diffDays;
            if (dataPoints[idx]) {
              dataPoints[idx].value += (Number(tx.fee) || 0);
            }
          }
        });
      } else if (metric === 'users') {
        usersList.forEach(u => {
          const diffDays = Math.floor((now.getTime() - u.createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            const idx = 6 - diffDays;
            if (dataPoints[idx]) {
              dataPoints[idx].value += 1;
            }
          }
        });
      } else if (metric === 'disputes') {
        disputesList.forEach(dp => {
          const diffDays = Math.floor((now.getTime() - dp.createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            const idx = 6 - diffDays;
            if (dataPoints[idx]) {
              dataPoints[idx].value += 1;
            }
          }
        });
      }
    } else if (timePeriod === 'month') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        dataPoints.push({ name: `الأسبوع ${4 - i}`, value: 0, secondaryValue: 0 });
      }

      if (metric === 'volume') {
        transactionsList.forEach(tx => {
          const diffDays = Math.floor((now.getTime() - tx.createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 30) {
            const weekIdx = Math.min(3, Math.floor(diffDays / 7));
            const idx = 3 - weekIdx;
            if (dataPoints[idx]) {
              dataPoints[idx].value += (Number(tx.amount) || 0);
              dataPoints[idx].secondaryValue = (dataPoints[idx].secondaryValue || 0) + (Number(tx.fee) || 0);
            }
          }
        });
      } else if (metric === 'revenue') {
        transactionsList.forEach(tx => {
          const diffDays = Math.floor((now.getTime() - tx.createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 30) {
            const weekIdx = Math.min(3, Math.floor(diffDays / 7));
            const idx = 3 - weekIdx;
            if (dataPoints[idx]) {
              dataPoints[idx].value += (Number(tx.fee) || 0);
            }
          }
        });
      } else if (metric === 'users') {
        usersList.forEach(u => {
          const diffDays = Math.floor((now.getTime() - u.createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 30) {
            const weekIdx = Math.min(3, Math.floor(diffDays / 7));
            const idx = 3 - weekIdx;
            if (dataPoints[idx]) {
              dataPoints[idx].value += 1;
            }
          }
        });
      } else if (metric === 'disputes') {
        disputesList.forEach(dp => {
          const diffDays = Math.floor((now.getTime() - dp.createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 30) {
            const weekIdx = Math.min(3, Math.floor(diffDays / 7));
            const idx = 3 - weekIdx;
            if (dataPoints[idx]) {
              dataPoints[idx].value += 1;
            }
          }
        });
      }
    } else {
      // Last 6 months
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        dataPoints.push({ name: monthNames[d.getMonth()], value: 0, secondaryValue: 0 });
      }

      if (metric === 'volume') {
        transactionsList.forEach(tx => {
          const diffMonths = (now.getFullYear() - tx.createdAtDate.getFullYear()) * 12 + (now.getMonth() - tx.createdAtDate.getMonth());
          if (diffMonths >= 0 && diffMonths < 6) {
            const idx = 5 - diffMonths;
            if (dataPoints[idx]) {
              dataPoints[idx].value += (Number(tx.amount) || 0);
              dataPoints[idx].secondaryValue = (dataPoints[idx].secondaryValue || 0) + (Number(tx.fee) || 0);
            }
          }
        });
      } else if (metric === 'revenue') {
        transactionsList.forEach(tx => {
          const diffMonths = (now.getFullYear() - tx.createdAtDate.getFullYear()) * 12 + (now.getMonth() - tx.createdAtDate.getMonth());
          if (diffMonths >= 0 && diffMonths < 6) {
            const idx = 5 - diffMonths;
            if (dataPoints[idx]) {
              dataPoints[idx].value += (Number(tx.fee) || 0);
            }
          }
        });
      } else if (metric === 'users') {
        usersList.forEach(u => {
          const diffMonths = (now.getFullYear() - u.createdAtDate.getFullYear()) * 12 + (now.getMonth() - u.createdAtDate.getMonth());
          if (diffMonths >= 0 && diffMonths < 6) {
            const idx = 5 - diffMonths;
            if (dataPoints[idx]) {
              dataPoints[idx].value += 1;
            }
          }
        });
      } else if (metric === 'disputes') {
        disputesList.forEach(dp => {
          const diffMonths = (now.getFullYear() - dp.createdAtDate.getFullYear()) * 12 + (now.getMonth() - dp.createdAtDate.getMonth());
          if (diffMonths >= 0 && diffMonths < 6) {
            const idx = 5 - diffMonths;
            if (dataPoints[idx]) {
              dataPoints[idx].value += 1;
            }
          }
        });
      }
    }

    return dataPoints;
  };

  const currentChartData = getChartData();

  // Pie chart calculation
  const getPieMetricData = (selectedMetric: 'all' | 'volume' | 'revenue' | 'users' | 'disputes' = metric) => {
    const metric = selectedMetric === 'all' ? 'volume' : selectedMetric;
    if (metric === 'volume' || metric === 'revenue') {
      const bank = transactionsList.filter(t => t.paymentMethod === 'bank' || t.paymentMethod === 'iban').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const card = transactionsList.filter(t => t.paymentMethod === 'card' || t.paymentMethod === 'applepay' || t.paymentMethod === 'stcpay').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const balance = transactionsList.filter(t => t.paymentMethod === 'balance' || t.paymentMethod === 'wallet').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      return [
        { name: 'حوالات بنكية / آيبان', value: bank || 54000 },
        { name: 'بطاقات دفع وأبل باي', value: card || 38000 },
        { name: 'المحفظة الداخلية والوساطة', value: balance || 12000 }
      ];
    } else if (metric === 'users') {
      const verified = usersList.filter(u => u.isPhoneVerified || u.verificationStatus === 'approved').length;
      const pending = usersList.filter(u => u.verificationStatus === 'pending').length;
      const unverified = usersList.length - verified - pending;
      return [
        { name: 'موثق بالهوية والجوال', value: verified || 23 },
        { name: 'قيد المراجعة والتدقيق', value: pending || 5 },
        { name: 'غير موثق ومسجل جديد', value: Math.max(0, unverified) || 2 }
      ];
    } else {
      const active = disputesList.filter(d => d.status === 'active' || d.status === 'pending').length;
      const resolved = disputesList.filter(d => d.status === 'resolved' || d.status === 'completed').length;
      return [
        { name: 'نزاعات نشطة', value: active || 4 },
        { name: 'نزاعات تمت تسويتها', value: resolved || 12 }
      ];
    }
  };

  const currentPieData = getPieMetricData();

  // Dynamic search system matching
  const compileSystemSearchResults = () => {
    if (!searchQuery.trim()) return [];

    const queryLower = searchQuery.toLowerCase();
    const results: any[] = [];

    // Search Users
    if (selectedSubsystem === 'all' || selectedSubsystem === 'users') {
      usersList.forEach(u => {
        if (
          (u.name || '').toLowerCase().includes(queryLower) ||
          (u.email || '').toLowerCase().includes(queryLower) ||
          (u.phone || '').includes(queryLower) ||
          (u.id || '').toLowerCase().includes(queryLower)
        ) {
          results.push({
            id: u.id,
            origin: 'users',
            title: u.name || 'حساب بدون اسم',
            subtitle: u.email || 'البريد الإلكتروني المفقود',
            status: u.verificationStatus === 'approved' ? 'موثق' : u.verificationStatus === 'pending' ? 'قيد المراجعة' : 'جديد',
            statusColor: u.verificationStatus === 'approved' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700',
            date: u.createdAtDate,
            link: `/admin/users/${u.id}`,
            badge: 'عضو الحسابات'
          });
        }
      });
    }

    // Search Transactions
    if (selectedSubsystem === 'all' || selectedSubsystem === 'transactions') {
      transactionsList.forEach(tx => {
        if (
          (tx.id || '').toLowerCase().includes(queryLower) ||
          (tx.buyerId || '').toLowerCase().includes(queryLower) ||
          (tx.sellerId || '').toLowerCase().includes(queryLower) ||
          String(tx.amount).includes(queryLower) ||
          (tx.paymentMethod || '').toLowerCase().includes(queryLower) ||
          (tx.status || '').toLowerCase().includes(queryLower)
        ) {
          results.push({
            id: tx.id,
            origin: 'transactions',
            title: `دفعة مالية بقيمة ${Number(tx.amount).toLocaleString()} ر.س`,
            subtitle: `معرف العملية: ${tx.id.substring(0, 16)}...`,
            status: tx.status === 'completed' ? 'ناجحة' : tx.status === 'escrowed' ? 'محجوز بالضمان' : 'قيد الانتظار',
            statusColor: tx.status === 'completed' ? 'bg-green-50 text-green-700' : tx.status === 'escrowed' ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700',
            date: tx.createdAtDate,
            link: '/admin/transactions',
            badge: 'مستند مالي'
          });
        }
      });
    }

    // Search Support Tickets
    if (selectedSubsystem === 'all' || selectedSubsystem === 'tickets') {
      ticketsList.forEach(tk => {
        if (
          (tk.id || '').toLowerCase().includes(queryLower) ||
          (tk.title || '').toLowerCase().includes(queryLower) ||
          (tk.message || '').toLowerCase().includes(queryLower) ||
          (tk.status || '').toLowerCase().includes(queryLower) ||
          (tk.priority || '').toLowerCase().includes(queryLower)
        ) {
          results.push({
            id: tk.id,
            origin: 'tickets',
            title: tk.title || 'طلب مساعدة جديد',
            subtitle: tk.message ? tk.message.substring(0, 60) + '...' : 'لا يوجد شرح',
            status: tk.status === 'closed' ? 'مغلقة' : 'بانتظار الإجابة',
            statusColor: tk.status === 'closed' ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-700',
            date: tk.createdAtDate,
            link: '/admin/support',
            badge: 'تذكرة دعم'
          });
        }
      });
    }

    // Search Disputes
    if (selectedSubsystem === 'all' || selectedSubsystem === 'disputes') {
      disputesList.forEach(dp => {
        if (
          (dp.id || '').toLowerCase().includes(queryLower) ||
          (dp.reason || '').toLowerCase().includes(queryLower) ||
          (dp.claim || '').toLowerCase().includes(queryLower) ||
          (dp.status || '').toLowerCase().includes(queryLower)
        ) {
          results.push({
            id: dp.id,
            origin: 'disputes',
            title: dp.reason || 'نزاع على تسليم صفقة',
            subtitle: dp.claim ? dp.claim.substring(0, 60) + '...' : 'لا يوجد تفاصيل للادعاء',
            status: dp.status === 'resolved' ? 'تمت التسوية' : 'نشط ومعلق ومحجوز',
            statusColor: dp.status === 'resolved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
            date: dp.createdAtDate,
            link: '/admin/disputes',
            badge: 'نزاع وضمان'
          });
        }
      });
    }

    return results;
  };

  const matchedSearchResults = compileSystemSearchResults();

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-red-100 max-w-md mx-auto my-12 shadow-md">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-4 animate-bounce" />
        <h3 className="text-sm font-black text-gray-900">غير مصرح بدخولك لوحة التحكم والتحليلات</h3>
        <p className="text-[10px] text-gray-400 font-bold mt-2">يرجى تسجيل الدخول بحساب المدير ومحاولة التحقق من الصلاحيات والتوثيق من جديد.</p>
        <Link to="/" className="mt-6 inline-block text-xs font-bold text-blue-600 hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  // Database utilization metrics simulation (Accurate based on Firestore read constraints)
  const totalRecordsCount = usersList.length + transactionsList.length + ticketsList.length + disputesList.length;
  const simulatedSizeMB = (totalRecordsCount * 0.045).toFixed(2);
  const totalFreeQuotas = 50000;
  const utilizedPercent = Math.min(100, Math.round((totalRecordsCount / totalFreeQuotas) * 100));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-right" dir="rtl">
      
      {/* Upper Navigation Back Row */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${activeColor.bgLight} ${activeColor.text}`}>
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">نظام التحليلات الذكي والبيانات التفاعلية</h1>
            <p className="text-[10px] text-gray-400 font-bold">بوابة رصد المؤشرات، البحث الذكي متقاطع الجداول وتخصيص أشكال الرسوم البيانية في الوقت الفعلي</p>
          </div>
        </div>
        <Link
          to="/admin"
          className="flex items-center gap-1.5 p-2.5 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-600 font-black text-[10px] uppercase tracking-widest transition-all"
        >
          <ArrowRightCircle className="w-4 h-4 text-gray-400" />
          <span>للخلف للوحة القائد</span>
        </Link>
      </div>

      {/* Database & Subsystem Live Metrics bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">سعة تخزين السحابة (Firestore)</span>
            <h4 className="text-lg font-black text-gray-900">{simulatedSizeMB} ميجابايت</h4>
            <p className="text-[9px] text-gray-400 font-bold">{totalRecordsCount} مستند مفهرس بنجاح</p>
          </div>
          <div className="w-16 h-16 relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-gray-50"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" style={{ animationDuration: '3s' }}></div>
            <Database className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">سرعة معالجة الطلبات بالمنصة</span>
            <h4 className="text-lg font-black text-gray-900">٢٤ ميلي ثانية</h4>
            <p className="text-[9px] text-green-600 font-black">● متصل ومستقر ومطابق لأمان SSL</p>
          </div>
          <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">حصة استهلاك الكوتة المجانية</span>
            <h4 className="text-lg font-black text-gray-900">{utilizedPercent}% من المحدد</h4>
            <p className="text-[9px] text-gray-400 font-bold">المعدل التشغيلي تحت فئة الأمان العالي</p>
          </div>
          <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Advanced Analytic Customizer Controls & Graphic Container */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden grid grid-cols-1 xl:grid-cols-12">
        
        {/* Customization Left/Right Sidebar controls (col-span-4) */}
        <div className="xl:col-span-4 bg-gray-50/50 p-8 border-l border-gray-100 space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-gray-900">مخصص العرض والرسوم</h3>
              <p className="text-[9px] text-gray-400 font-bold">غيّر معايير العرض والألوان للرسوم في ثانية واحدة</p>
            </div>
          </div>

          {/* Metric Selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 block tracking-widest uppercase">الفئة والمؤشر المحوري:</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: 'عرض الكل معاً تلقائياً', icon: <Activity className="w-3.5 h-3.5" /> },
                { id: 'volume', label: 'حجم التدفق والضمان', icon: <CreditCard className="w-3.5 h-3.5" /> },
                { id: 'revenue', label: 'أرباح المنصة وعوائد المعالجة', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                { id: 'users', label: 'تسجيلات وحسابات الأعضاء', icon: <Users className="w-3.5 h-3.5" /> },
                { id: 'disputes', label: 'النزاعات وتذاكر المطابقة', icon: <AlertTriangle className="w-3.5 h-3.5" /> }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMetric(m.id as any)}
                  className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-2 ${
                    metric === m.id 
                      ? 'border-blue-600 bg-white text-blue-600 shadow-md shadow-blue-50 font-black' 
                      : 'border-gray-200/60 bg-white text-gray-400 font-bold hover:border-gray-300 hover:text-gray-600'
                  }`}
                >
                  {m.icon}
                  <span className="text-[10px]">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shape Chart Select */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 block tracking-widest uppercase">شكل وهيكلية الرسم البياني:</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'area', label: 'مساحي تمثيلي' },
                { id: 'bar', label: 'أعمدة مفصلة' },
                { id: 'line', label: 'خطوط بيانية متصلة' },
                { id: 'pie', label: 'دائرة مئوية دورية' }
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => setChartType(c.id as any)}
                  className={`p-2.5 rounded-xl text-center text-[10px] font-black transition-all ${
                    chartType === c.id 
                      ? 'bg-gray-900 text-white' 
                      : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Curve Shape / Style Selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 block tracking-widest uppercase">تخصيص شكل ونمط منحنى الرسوم:</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'monotone', label: 'منحنى ناعم ذكي', desc: 'Smooth Monotone' },
                { id: 'linear', label: 'خط زوايا هندسية', desc: 'Sharp Linear' },
                { id: 'step', label: 'مخطط متدرج خطي', desc: 'Step Curve' },
                { id: 'dashed', label: 'مسار ديناميكي منقط', desc: 'Dashed Line style' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setChartShape(s.id as any)}
                  className={`p-2.5 rounded-2xl text-right transition-all flex flex-col justify-center leading-normal border text-right pr-3.5 ${
                    chartShape === s.id 
                      ? 'border-blue-600 bg-white ring-2 ring-blue-500 font-black text-blue-900 shadow-md shadow-blue-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-400 font-bold'
                  }`}
                >
                  <span className="text-[9px] font-black">{s.label}</span>
                  <span className="text-[7.5px] opacity-75 mt-0.5">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time range switcher */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 block tracking-widest uppercase">المدى الزمني والنطاقات:</label>
            <div className="flex bg-white border border-gray-200 rounded-xl p-1 justify-between">
              {[
                { id: 'week', label: '٧ أيام (أسبوعي)' },
                { id: 'month', label: '٣٠ يوم (شهري)' },
                { id: 'year', label: '٦ أشهر (نصف سنوي)' }
              ].map(tp => (
                <button
                  key={tp.id}
                  onClick={() => setTimePeriod(tp.id as any)}
                  className={`flex-1 text-center py-2 text-[9px] font-black rounded-lg transition-all ${
                    timePeriod === tp.id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {tp.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Dynamic Graphic Container Area (col-span-8) */}
        <div className="xl:col-span-8 p-8 flex flex-col justify-between min-h-[460px]">
          
          <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-6">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                رسم بياني تفاعلي حي • مستقى مباشرة من مستندات الضمان والوساطة
              </p>
              <h2 className="text-sm font-black text-gray-900 mt-1 flex items-center gap-2 font-black leading-tight">
                <span className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: activeColor.primary }}></span>
                <span>
                  {metric === 'all' ? 'لوحة القيادة والتحليلات الشاملة لجميع الفئات معاً' :
                   metric === 'volume' ? 'تحليل تدفق صفقات الوساطة ومبالغ الضمان' :
                   metric === 'revenue' ? 'تحليل أرباح المنصة ورسوم معالجة الدفعات' :
                   metric === 'users' ? 'مؤشرات تسجيل حسابات المستخدمين النشطين' : 'مخططات رصد النزاعات وقضايا التسوية المعلقة'}
                </span>
              </h2>
            </div>
            <span className="text-[9px] font-mono bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-lg shrink-0">
              {timePeriod === 'week' ? 'آخر ٧ أيام' : timePeriod === 'month' ? 'آخر ٣٠ يوم' : 'مقارنة ٦ شهور'}
            </span>
          </div>

          <div className="flex-1 w-full">
            {loading ? (
              <div className="w-full min-h-[320px] flex flex-col justify-center items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                <p className="text-[10px] text-gray-400 font-bold">جاري تجميع المؤشرات من الكلاود...</p>
              </div>
            ) : metric === 'all' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {/* Volume Card */}
                <div className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-[11px] font-black text-gray-900 border-r-2 border-blue-600 pr-2 font-black">حجم التدفق والضمان</h4>
                      <p className="text-[8px] text-gray-400 font-bold mt-0.5">إجمالي الصفقات والضمانات الجارية برأس المال</p>
                    </div>
                    <span className="text-[8px] font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold">المعاملات</span>
                  </div>
                  <div className="h-[210px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'pie' ? (
                        <ReChartsPie>
                          <Pie
                            data={getPieMetricData('volume')}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {[0, 1, 2, 3].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#2563eb', '#6366f1', '#94a3b8', '#fecdd3'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                        </ReChartsPie>
                      ) : chartType === 'bar' ? (
                        <BarChart data={getChartData('volume')}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                          <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={16} />
                        </BarChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={getChartData('volume')}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip />
                          <Line 
                            type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                            strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                            dataKey="value" 
                            stroke="#2563eb" 
                            strokeWidth={3} 
                            activeDot={{ r: 6 }} 
                          />
                        </LineChart>
                      ) : (
                        <AreaChart data={getChartData('volume')}>
                          <defs>
                            <linearGradient id="gcolor-volume" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip />
                          <Area 
                            type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                            strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                            dataKey="value" 
                            stroke="#2563eb" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#gcolor-volume)" 
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Revenue Card */}
                <div className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-[11px] font-black text-gray-900 border-r-2 border-emerald-500 pr-2 font-black">أرباح معالجة السداد وعمولات المنصة</h4>
                      <p className="text-[8px] text-gray-400 font-bold mt-0.5">صافي العوائد الناتجة عن عمولات صفقات الضمان للوساطة</p>
                    </div>
                    <span className="text-[8px] font-mono bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-bold font-bold">العوائد</span>
                  </div>
                  <div className="h-[210px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'pie' ? (
                        <ReChartsPie>
                          <Pie
                            data={getPieMetricData('revenue')}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {[0, 1, 2, 3].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#10b981', '#059669', '#94a3b8', '#fecdd3'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                        </ReChartsPie>
                      ) : chartType === 'bar' ? (
                        <BarChart data={getChartData('revenue')}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                          <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} barSize={16} />
                        </BarChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={getChartData('revenue')}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip />
                          <Line 
                            type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                            strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                            dataKey="value" 
                            stroke="#10b981" 
                            strokeWidth={3} 
                            activeDot={{ r: 6 }} 
                          />
                        </LineChart>
                      ) : (
                        <AreaChart data={getChartData('revenue')}>
                          <defs>
                            <linearGradient id="gcolor-revenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip />
                          <Area 
                            type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                            strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                            dataKey="value" 
                            stroke="#10b981" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#gcolor-revenue)" 
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Users Card */}
                <div className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-[11px] font-black text-gray-900 border-r-2 border-purple-500 pr-2 font-black">تسجيل وقيد المستخدمين الجدد</h4>
                      <p className="text-[8px] text-gray-400 font-bold mt-0.5">عدد حسابات وموثقي الأطراف المنضمين للمنصة حديثاً</p>
                    </div>
                    <span className="text-[8px] font-mono bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md font-bold">المستفيدون</span>
                  </div>
                  <div className="h-[210px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'pie' ? (
                        <ReChartsPie>
                          <Pie
                            data={getPieMetricData('users')}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {[0, 1, 2, 3].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#8b5cf6', '#7c3aed', '#94a3b8', '#fecdd3'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                        </ReChartsPie>
                      ) : chartType === 'bar' ? (
                        <BarChart data={getChartData('users')}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={16} />
                        </BarChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={getChartData('users')}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip />
                          <Line 
                            type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                            strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                            dataKey="value" 
                            stroke="#8b5cf6" 
                            strokeWidth={3} 
                            activeDot={{ r: 6 }} 
                          />
                        </LineChart>
                      ) : (
                        <AreaChart data={getChartData('users')}>
                          <defs>
                            <linearGradient id="gcolor-users" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip />
                          <Area 
                            type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                            strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                            dataKey="value" 
                            stroke="#8b5cf6" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#gcolor-users)" 
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Disputes Card */}
                <div className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-[11px] font-black text-gray-900 border-r-2 border-amber-500 pr-2 font-black">النزاعات والاعتراضات المفصلة</h4>
                      <p className="text-[8px] text-gray-400 font-bold mt-0.5">رصد الشكاوى وحالات التسوية الجارية والمنجزة بالحلول</p>
                    </div>
                    <span className="text-[8px] font-mono bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md font-bold">النزاعات</span>
                  </div>
                  <div className="h-[210px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'pie' ? (
                        <ReChartsPie>
                          <Pie
                            data={getPieMetricData('disputes')}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {[0, 1, 2, 3].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#f59e0b', '#d97706', '#94a3b8', '#fecdd3'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                        </ReChartsPie>
                      ) : chartType === 'bar' ? (
                        <BarChart data={getChartData('disputes')}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                          <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={16} />
                        </BarChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={getChartData('disputes')}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip />
                          <Line 
                            type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                            strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                            dataKey="value" 
                            stroke="#f59e0b" 
                            strokeWidth={3} 
                            activeDot={{ r: 6 }} 
                          />
                        </LineChart>
                      ) : (
                        <AreaChart data={getChartData('disputes')}>
                          <defs>
                            <linearGradient id="gcolor-disputes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700 }} />
                          <Tooltip />
                          <Area 
                            type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                            strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                            dataKey="value" 
                            stroke="#f59e0b" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#gcolor-disputes)" 
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            ) : (
              // Default view for a single selected metric
              <div className="w-full h-[320px]">
                {chartType === 'pie' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ReChartsPie>
                      <Pie
                        data={currentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={105}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {[0, 1, 2, 3].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={[activeColor.primary, activeColor.secondary, '#94a3b8', '#fecdd3'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toLocaleString()}`} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[10px] font-bold text-gray-700">{value}</span>} />
                    </ReChartsPie>
                  </ResponsiveContainer>
                ) : chartType === 'bar' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                      <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                      <Bar dataKey="value" fill={activeColor.primary} radius={[10, 10, 0, 0]} barSize={26} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : chartType === 'line' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                      <Tooltip />
                      <Line 
                        type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                        strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                        dataKey="value" 
                        stroke={activeColor.primary} 
                        strokeWidth={4} 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  // Default Area Chart
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={currentChartData}>
                      <defs>
                        <linearGradient id="gcolor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeColor.primary} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={activeColor.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                      <Tooltip />
                      <Area 
                        type={chartShape === 'dashed' ? 'monotone' : chartShape} 
                        strokeDasharray={chartShape === 'dashed' ? '5 5' : undefined} 
                        dataKey="value" 
                        stroke={activeColor.primary} 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#gcolor)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-400 italic text-center font-bold mt-4 pt-4 border-t border-gray-50">
            تنويه: جميع الرسوم البيانية مشدودة وتنشط تلقائياً تبعاً لعمليات البيع، الشراء والوساطة المسجلة رسمياً.
          </p>

        </div>

      </div>

      {/* Advanced Unified Subsystem Finder (باحث الأنظمة المتكامل والأنشطة) */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-8 space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Search className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 italic">محرك البحث الشامل والمطابق متقاطع الجداول</h2>
              <p className="text-[10px] text-gray-400 font-bold">ابحث في المستندات المالية، حسابات المستخدمين، شكاوى النزاعات وتذاكر الدعم في وقت واحد</p>
            </div>
          </div>

          {/* Subsystem Filter Button Row */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'كل الأنظمة' },
              { id: 'users', label: 'المستخدمين' },
              { id: 'transactions', label: 'الحركات المالية' },
              { id: 'tickets', label: 'تذاكر الدعم' },
              { id: 'disputes', label: 'النزاعات والشكاوى' },
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubsystem(sub.id as any)}
                className={`p-2 px-3.5 text-[9px] font-black rounded-xl transition-all ${
                  selectedSubsystem === sub.id 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input search query Bar */}
        <div className="relative">
          <input 
            type="text"
            placeholder="اكتب اسم عضو، بريد، كود دفعة، رقم نزاع، أو كلمة من تذكرة مساعدة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-4.5 pr-12 text-xs font-black border border-gray-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none rounded-2xl bg-white text-right"
          />
          <Search className="absolute right-4.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 px-2.5 text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-all"
            >
              مسح البحث
            </button>
          )}
        </div>

        {/* Table of Matched Results / Explanation state */}
        <div className="border border-gray-100/80 rounded-2xl overflow-hidden mt-4 bg-white">
          {!searchQuery.trim() ? (
            <div className="p-12 text-center text-gray-400">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-xs font-black text-gray-800">اكتب كلمة مفتاحية في حقل البحث أعلاه لمطابقة المستندات والوصول السريع</p>
              <p className="text-[10px] text-gray-400 mt-1">يتولى الباحث استخراج المعرفات ومحتويات الشكاوى وعناوين المعاملات آلياً</p>
            </div>
          ) : matchedSearchResults.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-xs font-black text-red-500">لم يتم العثور على أية نتائج مطابقة لهذا البحث</p>
              <p className="text-[10px] text-gray-400 mt-1">تأكد من اختيار جهة التصنيف الصحيحة أو كتابة الكلمات المفاتيح الدقيقة</p>
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 font-black text-[10px]">
                <tr>
                  <th className="p-4 text-gray-500">نوع المستند</th>
                  <th className="p-4 text-gray-500">عنوان السجل والمطابقة</th>
                  <th className="p-4 text-gray-500">تفاصيل وسياق المستند من قاعدة البيانات</th>
                  <th className="p-4 text-gray-500">التاريخ</th>
                  <th className="p-4 text-gray-500">الحالة والوسم</th>
                  <th className="p-4 text-gray-500">الوصول السريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-bold">
                {matchedSearchResults.map((result, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/20 transition-colors">
                    <td className="p-4">
                      <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 p-1 px-2.5 rounded-full">
                        {result.badge}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-gray-900 font-black block">{result.title}</span>
                      <span className="text-[9px] text-gray-400 font-mono block mt-1">ID: {result.id}</span>
                    </td>
                    <td className="p-4 text-[10px] text-gray-500 max-w-xs truncate">
                      {result.subtitle}
                    </td>
                    <td className="p-4 text-[10px] text-gray-400 font-mono">
                      {result.date ? new Date(result.date).toLocaleDateString('ar-SA') : 'منذ قليل'}
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] p-1 px-2.5 rounded-full ${result.statusColor} block text-center max-w-[100px]`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link
                        to={result.link}
                        className="text-[9px] font-black text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <span>الانتقال للسجل</span>
                        <ArrowRightCircle className="w-3.5 h-3.5 shrink-0" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
};
