import React, { useEffect, useState } from 'react';
import { 
  collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, 
  serverTimestamp, increment, addDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { handleFirestoreError, OperationType } from '../../lib/firestoreUtils';
import { UserProfile } from '../../types';
import { 
  TrendingUp, Wallet, ShieldCheck, Clock, Activity, 
  ArrowUpRight, Users as UsersIcon, MessageSquare, 
  AlertTriangle, LayoutDashboard, Zap, ArrowLeftRight, 
  FileText, Sliders, Sparkles, Server, Database,
  RefreshCw, Key, ShieldAlert, CheckCircle2, Lock, Smartphone, Search,
  Check, X, ExternalLink, Scale, UserCheck, UserX, Landmark, AlertCircle
} from 'lucide-react';
import { 
  format, startOfWeek, eachDayOfInterval, endOfWeek, isSameDay, 
  startOfMonth, endOfMonth, eachWeekOfInterval 
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { ReportGenerator } from '../../components/admin/ReportGenerator';
import { toast } from 'sonner';
import { sendNotification } from '../../lib/notificationService';

export const AdminOverview: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;
  const navigate = useNavigate();
  const [searchOrderId, setSearchOrderId] = useState('');

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<'operations' | 'performance' | 'infra'>('operations');

  // Chart & Reports state
  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [chartShape, setChartShape] = useState<'monotone' | 'linear' | 'step' | 'dashed'>('monotone');
  const [showReports, setShowReports] = useState(false);

  // Operational State
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [activeDisputes, setActiveDisputes] = useState<any[]>([]);
  const [pendingBankTransfers, setPendingBankTransfers] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals & Reason State
  const [rejectingUser, setRejectingUser] = useState<UserProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [rejectingBankTransfer, setRejectingBankTransfer] = useState<any | null>(null);
  const [bankTransferRejectionReason, setBankTransferRejectionReason] = useState('');
  
  const [resolvingDispute, setResolvingDispute] = useState<any | null>(null);
  const [disputeResolutionNotes, setDisputeResolutionNotes] = useState('');

  // AI Dispute Arbitrator State
  const [aiRecommendation, setAiRecommendation] = useState<Record<string, any>>({});
  const [loadingAiForDispute, setLoadingAiForDispute] = useState<string | null>(null);

  // Fraud Auto-Moderator State
  const [fraudScanResult, setFraudScanResult] = useState<any | null>(null);
  const [runningFraudScan, setRunningFraudScan] = useState(false);

  const [stats, setStats] = useState({
    totalVolume: 0,
    totalFees: 0,
    activeEscrows: 0,
    pendingVerifications: 0,
    totalUsers: 0,
    totalTickets: 0,
    totalReviews: 0,
    totalFeedback: 0,
    totalOrders: 0,
    totalSmsLogs: 0,
    totalSystemLogs: 0,
    totalAuditLogs: 0,
    recentTransactions: [] as any[],
    chartData: [] as { name: string, value: number }[],
    allTx: [] as any[],
    disputeCount: 0,
    systemStatus: 'connected' as 'connected' | 'degraded' | 'offline',
    lastActivity: new Date()
  });

  type GatewayEntry = {
    provider: string;
    label: string;
    isConfigured: boolean;
    baseUrl?: string;
    status: 'connected' | 'degraded' | 'offline';
    latency: number;
    error: string;
    uptime: number | null;
    lastSuccess: string | null;
    checkedAt: string;
    merchantId?: string | null;
    terminalId?: string | null;
    apiPassword?: string | null;
    apiKey?: string | null;
    senderId?: string | null;
    projectId?: string;
    docsRead?: number;
    qrPending?: boolean;
  };

  const [gatewayHealth, setGatewayHealth] = useState<{
    payment: GatewayEntry;
    sms: GatewayEntry;
    firebase: GatewayEntry;
    whatsapp: GatewayEntry;
    checkedAt: string;
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

    // 1. Transactions Listener
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

      // Extract pending bank transfers
      const pendingTransfers = allTx.filter(
        (tx: any) => (tx.paymentMethod === 'bank' || tx.paymentMethod === 'iban') && tx.status === 'pending'
      );
      setPendingBankTransfers(pendingTransfers);

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

    // 2. Users Listener (KYC Pending)
    const userQ = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(userQ, (snapshot) => {
      const all = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      
      const pending = all.filter(u => u.verificationStatus === 'pending');
      setPendingUsers(pending);

      setStats(prev => ({ 
        ...prev, 
        totalUsers: all.length,
        pendingVerifications: pending.length 
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    // 3. Disputes Listener
    const disputeQ = collection(db, 'disputes');
    const unsubDisputes = onSnapshot(disputeQ, (snapshot) => {
      const allDisputes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const active = allDisputes.filter((d: any) => d.status === 'open');
      setActiveDisputes(active);
      setStats(prev => ({ ...prev, disputeCount: active.length }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'disputes');
    });

    // 4. Support Tickets count
    const ticketsQ = query(collection(db, 'support_tickets'));
    const unsubTickets = onSnapshot(ticketsQ, (snapshot) => {
      setStats(prev => ({ ...prev, totalTickets: snapshot.size }));
    });

    // 5. Reviews count
    const reviewsQ = collection(db, 'reviews');
    const unsubReviews = onSnapshot(reviewsQ, (snapshot) => {
      setStats(prev => ({ ...prev, totalReviews: snapshot.size }));
    });

    // 6. Feedback count
    const feedbackQ = collection(db, 'platform_feedback');
    const unsubFeedback = onSnapshot(feedbackQ, (snapshot) => {
      setStats(prev => ({ ...prev, totalFeedback: snapshot.size }));
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

  // ==========================================
  // OPERATIONAL ACTION HANDLERS
  // ==========================================

  // KYC Verification Actions
  const handleApproveVerification = async (uid: string) => {
    setActionLoading(true);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        verificationStatus: 'verified',
        isVerified: true,
        rating: 4,
        trustLevel: 80
      });
      await sendNotification(
        uid, 
        '✅ تهانينا! حسابك الآن موثق بالكامل', 
        'لقد تم التحقق من هويتك بنجاح. يمكنك الآن بدء تداول كميات كبيرة واستخدام كافة مميزات المنصة الاحترافية.', 
        'system', 
        'urgent',
        undefined,
        undefined,
        { label: 'ابدأ تداول الآن', url: '/dashboard' }
      );
      toast.success('تم توثيق الحساب بنجاح وإشعار العميل!');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الموافقة على طلب التوثيق.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectVerification = async (uid: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('يرجى تحديد أو كتابة سبب الرفض');
      return;
    }
    setActionLoading(true);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        verificationStatus: 'rejected',
        isVerified: false,
        verificationRejectionReason: reason
      });
      await sendNotification(uid, 'تنبيه: تحديث طلب التوثيق', `نعتذر، لم يتم قبول طلب التوثيق بسبب: ${reason}`, 'system', 'urgent');
      toast.success('تم رفض طلب التوثيق وإرسال إشعار للمستفيد.');
      setRejectingUser(null);
      setRejectionReason('');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء رفض التوثيق.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── AI Dispute Arbitrator ─────────────────────────────────────────────────
  const fetchAiRecommendation = async (disputeId: string) => {
    setLoadingAiForDispute(disputeId);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/ai-recommendation`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAiRecommendation(prev => ({ ...prev, [disputeId]: data }));
      toast.success('تم استلام توصية الذكاء الاصطناعي بنجاح');
    } catch {
      toast.error('فشل في استلام توصية الذكاء الاصطناعي');
    } finally {
      setLoadingAiForDispute(null);
    }
  };

  // ── Fraud Auto-Moderator Trigger ──────────────────────────────────────────
  const triggerFraudScan = async () => {
    setRunningFraudScan(true);
    setFraudScanResult(null);
    try {
      const res = await fetch('/api/admin/trigger-fraud-scan', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setFraudScanResult(data);
      const totalBlocked = (data.results?.identityTheft?.blocked?.length || 0) +
                           (data.results?.receiptForgery?.blocked?.length || 0) +
                           (data.results?.slaViolations?.blocked?.length || 0);
      if (totalBlocked > 0) {
        toast.warning(`🛡️ تم حظر ${totalBlocked} حساب مشبوه بنجاح`);
      } else {
        toast.success('✅ الفحص الأمني مكتمل — لا توجد تهديدات');
      }
    } catch {
      toast.error('فشل في تشغيل فحص الاحتيال');
    } finally {
      setRunningFraudScan(false);
    }
  };

  // Bank Transfer Actions
  const handleApproveBankTransfer = async (tx: any) => {
    setActionLoading(true);
    try {
      // 1. Confirm transaction
      await updateDoc(doc(db, 'transactions', tx.id), {
        status: 'completed',
        confirmedAt: serverTimestamp(),
      });
      // 2. Set order status to escrowed (locked securely in system)
      if (tx.orderId) {
        await updateDoc(doc(db, 'orders', tx.orderId), {
          status: 'escrowed',
          paymentRef: tx.id,
          updatedAt: serverTimestamp()
        });
        
        // Fetch order to get buyer & seller info for immediate notification
        const orderSnap = await getDoc(doc(db, 'orders', tx.orderId));
        if (orderSnap.exists()) {
          const orderData = orderSnap.data();
          const buyerId = orderData.buyerId;
          const sellerId = orderData.sellerId;
          
          if (buyerId) {
            await sendNotification(
              buyerId,
              '✅ تأكيد استلام الحوالة البنكية',
              `لقد تم تأكيد حوالتك البنكية للطلب #${tx.orderId.slice(0, 8)} بنجاح، وتم حفظ المبلغ بالضمان بسلام.`,
              'payment',
              'urgent'
            );
          }
          if (sellerId) {
            await sendNotification(
              sellerId,
              '🔒 تم تأمين المبلغ في الضمان',
              `تم إيداع مبلغ الطلب #${tx.orderId.slice(0, 8)} عبر التحويل البنكي وتأكيده. يمكنك الآن البدء بالتنفيذ بأمان.`,
              'order_update',
              'urgent'
            );
          }
        }
      }
      toast.success('تم تأكيد الحوالة البنكية وحجز الرصيد بالضمان بنجاح!');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تأكيد الحوالة.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBankTransfer = async (txId: string, orderId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('يرجى توضيح سبب الرفض');
      return;
    }
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'transactions', txId), {
        status: 'failed',
        rejectionReason: reason,
        rejectedAt: serverTimestamp()
      });
      
      const txSnap = await getDoc(doc(db, 'transactions', txId));
      if (txSnap.exists()) {
        const txData = txSnap.data();
        const buyerId = txData.userId || txData.buyerId;
        if (buyerId) {
          await sendNotification(
            buyerId,
            '❌ رفض الحوالة البنكية',
            `نعتذر، تم رفض حوالتك البنكية للطلب #${orderId.slice(0, 8)}. السبب: ${reason}`,
            'payment',
            'urgent'
          );
        }
      }
      toast.success('تم رفض الحوالة وإخطار العميل بنجاح.');
      setRejectingBankTransfer(null);
      setBankTransferRejectionReason('');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء رفض الحوالة.');
    } finally {
      setActionLoading(false);
    }
  };

  // Disputes Actions
  const handleReleaseToSeller = async (dispute: any) => {
    setActionLoading(true);
    try {
      const finalComment = disputeResolutionNotes.trim() || 'تمت تسوية النزاع وتحرير كامل مبلغ الضمان للبائع من قبل الإدارة.';
      
      const orderSnap = await getDoc(doc(db, 'orders', dispute.orderId));
      if (!orderSnap.exists()) {
        toast.error('لم يتم العثور على مستند الطلب الخاص بالنزاع.');
        setActionLoading(false);
        return;
      }
      const orderData = orderSnap.data();
      const isDev = !orderData?.paymentRef || orderData.paymentRef.startsWith('DEV-') || orderData.paymentRef.startsWith('fake-');
      
      if (!isDev) {
        try {
          const response = await fetch('/api/payment/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: dispute.orderId, amount: dispute.amount, transactionId: orderData?.paymentRef })
          });
          if (!response.ok) {
            toast.error('فشل تحويل المبلغ من بوابة الدفع! لم يتم إغلاق النزاع لحماية الرصيد.');
            setActionLoading(false);
            return;
          }
        } catch (err) {
          toast.error('فشل الاتصال ببوابة الدفع لإيداع الرصيد.');
          setActionLoading(false);
          return;
        }
      }

      // Update Dispute
      await updateDoc(doc(db, 'disputes', dispute.id), {
        status: 'resolved',
        resolution: 'released_to_seller',
        resolutionNotes: finalComment,
        resolvedAt: serverTimestamp(),
        resolvedById: user?.uid
      });

      // Update Order
      await updateDoc(doc(db, 'orders', dispute.orderId), {
        status: 'completed',
        updatedAt: serverTimestamp()
      });

      // Increment seller's balance
      const sellerNetShare = orderData?.paymentFees?.sellerNetShare || dispute.amount;
      if (dispute.sellerId && dispute.sellerId !== 'unknown') {
        await updateDoc(doc(db, 'users', dispute.sellerId), { balance: increment(sellerNetShare) });
      }

      // Record Order event log
      await addDoc(collection(db, 'orderLogs'), {
        orderId: dispute.orderId,
        userId: user?.uid || 'ADMIN',
        action: 'تسوية نزاع: تحرير بالكامل للبائع',
        previousStatus: 'disputed',
        newStatus: 'completed',
        comment: finalComment,
        createdAt: serverTimestamp()
      });

      // Push Notifications
      await sendNotification(
        dispute.sellerId,
        '🚨 تسوية نزاع: تم تحرير الرصيد لك',
        `تمت تسوية النزاع المالي لصالحك من قبل الإدارة. القرار: ${finalComment}`,
        'settlement',
        'urgent',
        dispute.orderId
      );

      await sendNotification(
        dispute.buyerId,
        '🚨 قرار تسوية النزاع المالي',
        `تمت تسوية النزاع الإداري وتحرير الرصيد للبائع. القرار: ${finalComment}`,
        'order_update',
        'normal',
        dispute.orderId
      );

      toast.success('تمت تسوية النزاع بنجاح وتحرير الرصيد للبائع!');
      setResolvingDispute(null);
      setDisputeResolutionNotes('');
    } catch (err) {
      toast.error('حدث خطأ أثناء إجراء التسوية');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundToBuyer = async (dispute: any) => {
    setActionLoading(true);
    try {
      const finalComment = disputeResolutionNotes.trim() || 'تمت تسوية النزاع وإلغاء المعاملة وإرجاع كامل مبلغ الضمان للمشتري.';
      
      const orderSnap = await getDoc(doc(db, 'orders', dispute.orderId));
      if (!orderSnap.exists()) {
        toast.error('لم يتم العثور على مستند الطلب الخاص بالنزاع.');
        setActionLoading(false);
        return;
      }
      const orderData = orderSnap.data();
      const isDev = !orderData?.paymentRef || orderData.paymentRef.startsWith('DEV-') || orderData.paymentRef.startsWith('fake-');
      
      if (!isDev) {
        try {
          const response = await fetch('/api/payment/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: dispute.orderId, amount: dispute.amount, transactionId: orderData?.paymentRef })
          });
          if (!response.ok) {
            toast.error('فشل إرجاع المبلغ من بوابة الدفع! لم يتم إغلاق النزاع لحماية الرصيد.');
            setActionLoading(false);
            return;
          }
        } catch (err) {
          toast.error('فشل الاتصال ببوابة الدفع لإرجاع الرصيد.');
          setActionLoading(false);
          return;
        }
      }

      // Update Dispute
      await updateDoc(doc(db, 'disputes', dispute.id), {
        status: 'resolved',
        resolution: 'refunded_to_buyer',
        resolutionNotes: finalComment,
        resolvedAt: serverTimestamp(),
        resolvedById: user?.uid
      });

      // Update Order
      await updateDoc(doc(db, 'orders', dispute.orderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });

      // Record Order event log
      await addDoc(collection(db, 'orderLogs'), {
        orderId: dispute.orderId,
        userId: user?.uid || 'ADMIN',
        action: 'تسوية نزاع: إرجاع الرصيد للمشتري',
        previousStatus: 'disputed',
        newStatus: 'cancelled',
        comment: finalComment,
        createdAt: serverTimestamp()
      });

      // Push Notifications
      await sendNotification(
        dispute.buyerId,
        '🚨 تسوية نزاع: تم إرجاع المبلغ لك',
        `تمت تسوية النزاع المالي لصالحك وإرجاع كامل مبلغ الضمان لبطاقتك/حسابك. القرار: ${finalComment}`,
        'order_update',
        'urgent',
        dispute.orderId
      );

      await sendNotification(
        dispute.sellerId,
        '🚨 قرار تسوية النزاع المالي',
        `تمت تسوية النزاع الإداري وإلغاء المعاملة وإرجاع الرصيد للمشتري. القرار: ${finalComment}`,
        'order_update',
        'normal',
        dispute.orderId
      );

      toast.success('تمت تسوية النزاع بنجاح وإرجاع الرصيد للمشتري!');
      setResolvingDispute(null);
      setDisputeResolutionNotes('');
    } catch (err) {
      toast.error('حدث خطأ أثناء إجراء التسوية');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const totalOpsPending = pendingUsers.length + pendingBankTransfers.length + activeDisputes.length;

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
    <div className="space-y-8 animate-in fade-in duration-700 text-right font-sans" dir="rtl">
      
      {/* Dynamic Futuristic Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-white border border-white/20 shadow-inner rotate-3 hover:rotate-12 transition-all duration-300 select-none text-right">
              <LayoutDashboard className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight leading-none">
                  لوحة إدارة <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">الضمان والوساطة والتحليلات</span>
                </h1>
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
            <Link to="/admin/settings" className="flex-1 lg:flex-initial text-center px-5 py-3 bg-white/10 text-white rounded-2xl font-bold text-[11px] hover:bg-white/25 border border-white/10 tracking-wider transition-all">
              إعدادات المنصة
            </Link>
            <button 
              onClick={() => setShowReports(true)}
              className="flex-1 lg:flex-initial px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[11px] hover:bg-blue-700 hover:scale-[1.01] active:scale-95 shadow-xl shadow-blue-900/30 transition-all flex items-center justify-center gap-2 border border-blue-500"
            >
              <FileText className="w-4 h-4" />
              تصدير التقارير المطورة
            </button>
          </div>
        </div>
      </div>

      {/* Modern 3-Tab Operational Command Center Bar */}
      <div className="bg-gray-100 p-2 rounded-[2rem] flex flex-wrap md:flex-nowrap gap-2 items-center shadow-inner">
        <button
          onClick={() => setActiveTab('operations')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-[1.5rem] text-xs font-black transition-all ${
            activeTab === 'operations' 
              ? 'bg-white text-blue-600 shadow-md scale-[1.02]' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>العمليات والمهام العاجلة</span>
          {totalOpsPending > 0 && (
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-mono font-black animate-pulse">
              {totalOpsPending}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-[1.5rem] text-xs font-black transition-all ${
            activeTab === 'performance' 
              ? 'bg-white text-blue-600 shadow-md scale-[1.02]' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>التحليلات والأداء المالي</span>
        </button>

        <button
          onClick={() => setActiveTab('infra')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-[1.5rem] text-xs font-black transition-all ${
            activeTab === 'infra' 
              ? 'bg-white text-blue-600 shadow-md scale-[1.02]' 
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>البنية التحتية والمراقبة (NOC)</span>
        </button>
      </div>

      {/* Prominent Focal Quick Search Banner with real-time format validation */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white shadow-xl border border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-right">
             <h3 className="text-base font-black">البحث الفوري عن صفقات الضمان والطلبات</h3>
             <p className="text-[10px] text-blue-100 font-bold mt-1">أدخل معرّف الطلب (أرقام وحرف واحد، مثل: 582910A) للوصول المباشر وتتبع حالة الصفقات والوساطة.</p>
          </div>
          
          {(() => {
            const isTouched = searchOrderId.length > 0;
            const isValid = /^\d{6}[A-Za-z]$/.test(searchOrderId);
            const isInvalid = isTouched && !isValid;
            
            return (
              <form 
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  if (isValid) navigate(`/order/${searchOrderId.trim().toUpperCase()}`); 
                }} 
                className="flex flex-col gap-1.5 w-full md:w-auto shrink-0"
              >
                <div className="flex gap-2">
                  <button 
                    type="submit" 
                    disabled={!isValid}
                    className={`px-5 py-3.5 rounded-2xl flex items-center justify-center transition-all shadow-lg font-black text-xs shrink-0 gap-1 ${
                      isValid 
                        ? 'bg-gray-950 hover:bg-gray-900 text-white cursor-pointer' 
                        : 'bg-white/5 text-white/30 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    <span>ابحث الآن</span>
                  </button>
                  <input
                    type="text"
                    value={searchOrderId}
                    onChange={(e) => setSearchOrderId(e.target.value)}
                    placeholder="رقم الطلب (مثال: 582910A)"
                    className={`w-full md:w-64 h-12 text-center font-mono font-bold text-xs focus:outline-none transition-all shadow-inner rounded-2xl px-4 border ${
                      isInvalid 
                        ? 'bg-red-500/20 border-red-400 text-white placeholder-red-300 focus:bg-red-500/30' 
                        : 'bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-gray-900 placeholder-white/60 focus:placeholder-gray-400 border-white/20 focus:border-white'
                    }`}
                  />
                </div>
                {isInvalid && (
                  <p className="text-[9px] text-red-200 font-bold text-center md:text-left animate-bounce">
                    ⚠️ المعرّف يجب أن يتكون من 6 أرقام وحرف واحد (مثال: 123456A)
                  </p>
                )}
              </form>
            );
          })()}
        </div>
      </div>

      {/* ==========================================
          TAB 1: OPERATIONS COMMAND CENTER
         ========================================== */}
      {activeTab === 'operations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: KYC National ID Pending Verifications */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-[520px]">
            <div className="flex justify-between items-center pb-4 border-b border-gray-50 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-black text-gray-900">توثيق الهوية الوطنية (KYC)</h3>
              </div>
              <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-[9px] font-black">
                {pendingUsers.length} قيد المراجعة
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {pendingUsers.length > 0 ? (
                pendingUsers.map(user => (
                  <div key={user.uid} className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl hover:border-blue-100 transition-all space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <img src={user.photoURL} alt="" className="w-8 h-8 rounded-lg object-cover ring-2 ring-white shadow-sm" />
                        <div>
                          <p className="text-xs font-black text-gray-800 leading-tight">{user.displayName}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5 max-w-[140px] truncate">{user.email}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[9px] bg-gray-100 px-2 py-0.5 rounded font-black text-gray-500">
                        #{user.userShortId || '---'}
                      </span>
                    </div>

                    {user.idNumber && (
                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2.5 rounded-xl border border-gray-100">
                        <div className="text-right">
                          <p className="text-gray-400 font-bold">رقم الهوية الوطنية</p>
                          <p className="font-mono font-black text-gray-700 mt-0.5">{user.idNumber}</p>
                        </div>
                        {user.idPhotoUrl ? (
                          <div className="text-left flex items-center justify-end">
                            <a 
                              href={user.idPhotoUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[9px] text-blue-600 font-black hover:underline flex items-center gap-0.5"
                            >
                              <span>عرض المرفق</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        ) : (
                          <div className="text-left text-gray-400 text-[9px] font-bold">لا يوجد مرفق هوية</div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveVerification(user.uid)}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black hover:bg-green-600 transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>توثيق الهوية</span>
                      </button>
                      <button
                        onClick={() => setRejectingUser(user)}
                        disabled={actionLoading}
                        className="py-2 px-3 bg-red-50 text-red-650 border border-red-100 rounded-xl text-[10px] font-black hover:bg-red-100 transition-all flex items-center justify-center disabled:opacity-50"
                        title="رفض الطلب"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-gray-300">
                  <CheckCircle2 className="w-12 h-12 text-green-300 mb-3" />
                  <p className="text-xs font-black">لا توجد طلبات توثيق معلقة حالياً</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">عمل رائع! كل المستخدمين مستوفون للشروط</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Manual Bank Transfer Confirmation */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-[520px]">
            <div className="flex justify-between items-center pb-4 border-b border-gray-50 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Landmark className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-black text-gray-900">حوالات بنكية معلقة بالتأكيد</h3>
              </div>
              <span className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full text-[9px] font-black">
                {pendingBankTransfers.length} معلقة
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {pendingBankTransfers.length > 0 ? (
                pendingBankTransfers.map(tx => (
                  <div key={tx.id} className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl hover:border-emerald-100 transition-all space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="text-right">
                        <p className="text-xs font-black text-gray-800">حوالة من: {tx.userEmail?.split('@')[0]}</p>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">TxID: {tx.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="text-left font-black text-sm text-emerald-700 italic font-mono bg-emerald-50 px-2.5 py-1 rounded-xl">
                        {Number(tx.amount).toLocaleString()} ر.س
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[9px] bg-white p-2 rounded-xl border border-gray-100">
                      <div className="text-right">
                        <span className="text-gray-400 font-bold">رقم الطلب</span>
                        <Link to={`/order/${tx.orderId}`} className="block font-mono font-black text-blue-600 hover:underline mt-0.5">
                          #{tx.orderId?.slice(0, 8).toUpperCase()}
                        </Link>
                      </div>
                      <div className="text-left flex flex-col justify-center items-end">
                        <span className="text-gray-400 font-bold">الإثبات/المستند</span>
                        {tx.receiptUrl ? (
                          <a href={tx.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-black hover:underline mt-0.5 flex items-center gap-0.5">
                            <span>عرض الإيصال</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-gray-400 font-bold mt-0.5">لا يوجد إيصال مرفق</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveBankTransfer(tx)}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تأكيد الإيداع بالضمان</span>
                      </button>
                      <button
                        onClick={() => setRejectingBankTransfer(tx)}
                        disabled={actionLoading}
                        className="py-2 px-3 bg-red-50 text-red-655 border border-red-100 rounded-xl text-[10px] font-black hover:bg-red-100 transition-all flex items-center justify-center disabled:opacity-50"
                        title="رفض الحوالة"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-gray-300">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
                  <p className="text-xs font-black">لا توجد حوالات بنكية بانتظار التأكيد</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">كافة المدفوعات مؤمنة ويجري معالجتها بنجاح</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Active Dispute Control Center */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-[520px]">
            <div className="flex justify-between items-center pb-4 border-b border-gray-50 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-655 flex items-center justify-center">
                  <Scale className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-black text-gray-900">النزاعات والشكاوى النشطة</h3>
              </div>
              <span className="bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full text-[9px] font-black">
                {activeDisputes.length} Nزاعات مفتوحة
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {activeDisputes.length > 0 ? (
                activeDisputes.map(dispute => (
                  <div key={dispute.id} className="p-4 bg-red-50/10 border border-red-100/50 rounded-2xl transition-all space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="text-right">
                        <p className="text-xs font-black text-red-800">سبب النزاع: {dispute.reason}</p>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">معرف النزاع: {dispute.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="text-left font-black text-xs text-gray-900 bg-white border border-gray-100 px-2 py-0.5 rounded-lg">
                        {Number(dispute.amount).toLocaleString()} ر.س
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[9px] bg-white p-2 rounded-xl border border-gray-100">
                      <div className="text-right">
                        <span className="text-gray-400 font-bold">رقم الطلب</span>
                        <Link to={`/order/${dispute.orderId}`} className="block font-mono font-black text-blue-600 hover:underline mt-0.5">
                          #{dispute.orderId?.slice(0, 8).toUpperCase()}
                        </Link>
                      </div>
                      <div className="text-left">
                        <span className="text-gray-400 font-bold block">مقدم الطلب</span>
                        <span className="text-gray-650 font-black mt-0.5 truncate block max-w-[90px]">{dispute.raisedById === dispute.buyerId ? 'المشتري' : 'البائع والمورد'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchAiRecommendation(dispute.id)}
                        disabled={loadingAiForDispute === dispute.id}
                        className="flex-1 py-2 bg-gradient-to-l from-purple-600 to-indigo-600 text-white rounded-xl text-[10px] font-black hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${loadingAiForDispute === dispute.id ? 'animate-spin' : ''}`} />
                        <span>{aiRecommendation[dispute.id] ? 'إعادة التحليل' : 'توصية الذكاء الاصطناعي'}</span>
                      </button>
                      <button
                        onClick={() => setResolvingDispute({ ...dispute, type: 'release' })}
                        disabled={actionLoading}
                        className="py-2 px-3 bg-blue-600 text-white rounded-xl text-[10px] font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>للبائع</span>
                      </button>
                      <button
                        onClick={() => setResolvingDispute({ ...dispute, type: 'refund' })}
                        disabled={actionLoading}
                        className="py-2 px-3 bg-red-600 text-white rounded-xl text-[10px] font-black hover:bg-red-700 transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>للمشتري</span>
                      </button>
                    </div>

                    {/* AI Recommendation Card */}
                    {aiRecommendation[dispute.id] && (
                      <div className="mt-2 p-3 bg-gradient-to-l from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2 pb-2 border-b border-indigo-100/50">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider">تقرير الذكاء الاصطناعي</span>
                        </div>
                        
                        <p className="text-[10px] text-gray-700 font-bold leading-relaxed">
                          {aiRecommendation[dispute.id].summary}
                        </p>

                        <div className="flex gap-2">
                          <div className="flex-1 bg-blue-100/60 p-2 rounded-xl text-center">
                            <span className="text-[8px] text-blue-600 font-black block">البائع</span>
                            <span className="text-sm font-black text-blue-900">{aiRecommendation[dispute.id].split?.seller}%</span>
                          </div>
                          <div className="flex-1 bg-red-100/60 p-2 rounded-xl text-center">
                            <span className="text-[8px] text-red-600 font-black block">المشتري</span>
                            <span className="text-sm font-black text-red-900">{aiRecommendation[dispute.id].split?.buyer}%</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          {aiRecommendation[dispute.id].reasoning?.map((step: string, i: number) => (
                            <p key={i} className="text-[9px] text-gray-600 font-medium leading-relaxed flex gap-1.5">
                              <span className="text-indigo-400 font-black shrink-0">{i + 1}.</span>
                              {step}
                            </p>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            const rec = aiRecommendation[dispute.id];
                            const type = rec.recommendedResolution === 'release_to_seller' ? 'release' : 
                                         rec.recommendedResolution === 'refund_to_buyer' ? 'refund' : 'release';
                            setResolvingDispute({ ...dispute, type });
                            setDisputeResolutionNotes(`[قرار الذكاء الاصطناعي] ${rec.summary}`);
                          }}
                          className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>اعتماد قرار الذكاء الاصطناعي</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-gray-300">
                  <CheckCircle2 className="w-12 h-12 text-blue-400 mb-3" />
                  <p className="text-xs font-black">المنصة خالية من النزاعات النشطة</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">علاقات ممتازة وصفقات ناجحة بين التجار والعملاء</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ==========================================
          TAB 2: PERFORMANCE & ANALYTICS
         ========================================== */}
      {activeTab === 'performance' && (
        <div className="space-y-8">
          
          {/* Bento Grid: 4 KPI Cards */}
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
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer flex flex-col text-right"
                >
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-gray-50 rounded-full group-hover:scale-150 transition-transform duration-700 opacity-40 -z-10" />
                  
                  <div className="relative z-10 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-12 h-12 rounded-2xl ${colorStyles.ring} text-white flex items-center justify-center shadow-lg shadow-gray-100 group-hover:scale-110 transition-transform duration-300`}>
                        {React.cloneElement(s.icon as React.ReactElement, { className: 'w-5 h-5' })}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-black text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{s.trend}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-right">
                      <p className="text-gray-400 font-bold text-[10px] uppercase mb-1 tracking-widest">{s.label}</p>
                      <p className="text-xl md:text-2xl font-black text-gray-900 tabular-nums leading-tight">{s.value}</p>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-100 text-right">
                      <p className="text-[10px] text-gray-400 leading-normal font-medium">{s.info}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Bento Grid: Revenue Chart & Transaction Log */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Chart Block */}
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

            {/* Transaction Log Block */}
            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col justify-between text-right">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-50 mb-6">
                  <div className="text-right">
                    <h3 className="text-base md:text-lg font-black text-gray-900">سجل عمليات الضمان الأحدث</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">متابعة دقيقة وفورية لحركة المبالغ المودعة والمدفوعة</p>
                  </div>
                  <Link to="/admin/transactions" className="text-[10px] font-black text-blue-600 hover:text-blue-800 hover:underline transition-all uppercase tracking-widest shrink-0">
                    الكل ←
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
                              isCompleted ? 'bg-green-50 text-green-700 font-bold' : 
                              isEscrowed ? 'bg-orange-50 text-orange-700 font-bold' : 
                              'bg-gray-50 text-gray-600'
                            }`}>
                              <ArrowLeftRight className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-gray-900">ID: {tx.id.slice(0, 8).toUpperCase()}</span>
                                <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black ${
                                  isCompleted ? 'bg-green-100 text-green-800' :
                                  isEscrowed ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {isCompleted ? 'مكتمل ومسدد' : isEscrowed ? 'محتجز بالضمان' : tx.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-[9px] text-gray-400 font-bold text-right">
                                <span>طريقة السداد:</span>
                                <span className="text-gray-600 font-black">
                                  {tx.paymentMethod === 'bank' || tx.paymentMethod === 'iban' ? 'حوالة بنكية مباشرة' : 'بوابة دفع إلكترونية'}
                                </span>
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

          </div>

        </div>
      )}

      {/* ==========================================
          TAB 3: INFRASTRUCTURE & TELEMETRY NOC
         ========================================== */}
      {activeTab === 'infra' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left/Middle Column: 4 Generic Gateway Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <h3 className="text-base md:text-lg font-black text-gray-900">البوابات والربط الخارجي اللحظي</h3>
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">مراقبة وفحص مفاتيح الربط وسرعة استجابة البوابات الخارجية المشفرة</p>
              </div>

              {/* Manual Refresh Trigger */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!gatewayHealth ? (
                <div className="col-span-1 md:col-span-2 p-16 bg-white rounded-[2rem] border border-gray-100 flex flex-col items-center justify-center text-center gap-4 animate-pulse">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-800">جاري فحص حالة البوابات والربط الخارجي...</p>
                    <p className="text-[9.5px] text-gray-400 font-bold mt-1.5 leading-normal">
                      يتم الآن إجراء فحص حي ومباشر للمفاتيح المشفرة، وقياس سرعة استجابة الخوادم اللحظية بالملي ثانية.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Gateway 1: Payment Gateway */}
                  <div className="p-5 rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/20 relative overflow-hidden group space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          gatewayHealth?.payment?.status === 'connected' ? 'bg-blue-50 text-blue-600' :
                          gatewayHealth?.payment?.status === 'degraded' ? 'bg-amber-50 text-amber-600' :
                          'bg-red-50 text-red-650'
                        }`}>
                          <Lock className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-black text-gray-900">{gatewayHealth?.payment?.label || 'بوابة الدفع الإلكتروني'}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5 font-bold truncate max-w-[150px]">{gatewayHealth?.payment?.baseUrl || 'api.payment.local'}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                        gatewayHealth?.payment?.status === 'connected' ? 'bg-green-105 text-green-850' :
                        gatewayHealth?.payment?.status === 'degraded' ? 'bg-amber-105 text-amber-850' :
                        'bg-red-105 text-red-850'
                      }`}>
                        {gatewayHealth?.payment?.status === 'connected' ? 'نشط متصل' :
                         gatewayHealth?.payment?.status === 'degraded' ? 'استجابة بطيئة' : 'غير نشط'}
                      </span>
                    </div>

                    <div className="pt-3.5 border-t border-dashed border-gray-100 grid grid-cols-2 gap-3 text-[9px] text-right">
                      <div className="bg-gray-50/85 p-2 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-bold block">مُعرف الماركت (Merchant ID)</span>
                        <span className="font-mono text-gray-700 font-black block mt-0.5">{gatewayHealth?.payment?.merchantId || 'نشط ومؤمن'}</span>
                      </div>
                      <div className="bg-gray-50/85 p-2 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-bold block">رقم نقطة البيع (Terminal ID)</span>
                        <span className="font-mono text-gray-700 font-black block mt-0.5">{gatewayHealth?.payment?.terminalId || 'نشط ومؤمن'}</span>
                      </div>
                    </div>

                    {gatewayHealth?.payment?.error && (
                      <div className="p-2 bg-red-50/50 text-red-655 rounded-xl text-[9px] font-bold text-right flex items-center gap-1.5 border border-red-100/30">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>خطأ: {gatewayHealth?.payment?.error}</span>
                      </div>
                    )}
                  </div>

                  {/* Gateway 2: SMS Gateway */}
                  <div className="p-5 rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/20 relative overflow-hidden group space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          gatewayHealth?.sms?.status === 'connected' ? 'bg-purple-50 text-purple-600' :
                          gatewayHealth?.sms?.status === 'degraded' ? 'bg-amber-50 text-amber-600' :
                          'bg-red-50 text-red-650'
                        }`}>
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-black text-gray-900">{gatewayHealth?.sms?.label || 'بوابة مزود الرسائل القصيرة'}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5 font-bold truncate max-w-[150px]">{gatewayHealth?.sms?.baseUrl || 'api.sms.local'}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                        gatewayHealth?.sms?.status === 'connected' ? 'bg-green-105 text-green-850' :
                        gatewayHealth?.sms?.status === 'degraded' ? 'bg-amber-105 text-amber-850' :
                        'bg-red-105 text-red-850'
                      }`}>
                        {gatewayHealth?.sms?.status === 'connected' ? 'نشط متصل' :
                         gatewayHealth?.sms?.status === 'degraded' ? 'استجابة بطيئة' : 'غير نشط'}
                      </span>
                    </div>

                    <div className="pt-3.5 border-t border-dashed border-gray-100 grid grid-cols-2 gap-3 text-[9px] text-right">
                      <div className="bg-gray-50/85 p-2 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-bold block">مفتاح الـ API للربط</span>
                        <span className="font-mono text-gray-700 font-black block mt-0.5">{gatewayHealth?.sms?.apiKey || 'نشط ومؤمن'}</span>
                      </div>
                      <div className="bg-gray-50/85 p-2 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-bold block">هوية المرسل المعتمدة</span>
                        <span className="font-sans text-gray-700 font-black block mt-0.5">{gatewayHealth?.sms?.senderId || 'Arboon'}</span>
                      </div>
                    </div>

                    {gatewayHealth?.sms?.isConfigured ? (
                      <div className="p-2.5 bg-green-50/50 text-green-800 rounded-xl text-[9px] font-bold text-right flex items-center gap-1.5 border border-green-100/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        <span>مفاتيح الربط مستوردة بنجاح من بيئة الخادم</span>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50/50 text-amber-800 rounded-xl text-[9px] font-bold text-right flex items-center gap-1.5 border border-amber-100/30 animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>مزود الخدمة يعمل بنظام المحاكاة الافتراضية حالياً</span>
                      </div>
                    )}
                  </div>

                  {/* Gateway 3: Firebase Database */}
                  <div className="p-5 rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/20 relative overflow-hidden group space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          gatewayHealth?.firebase?.status === 'connected' ? 'bg-orange-50 text-orange-600' :
                          gatewayHealth?.firebase?.status === 'degraded' ? 'bg-amber-50 text-amber-600' :
                          'bg-red-50 text-red-650'
                        }`}>
                          <Database className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-black text-gray-900">{gatewayHealth?.firebase?.label || 'قاعدة بيانات Firebase'}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5 font-bold truncate max-w-[150px]">Firestore Cloud Datastore</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                        gatewayHealth?.firebase?.status === 'connected' ? 'bg-green-105 text-green-850' :
                        gatewayHealth?.firebase?.status === 'degraded' ? 'bg-amber-105 text-amber-850' :
                        'bg-red-105 text-red-850'
                      }`}>
                        {gatewayHealth?.firebase?.status === 'connected' ? 'نشط متصل' :
                         gatewayHealth?.firebase?.status === 'degraded' ? 'استجابة بطيئة' : 'غير نشط'}
                      </span>
                    </div>

                    <div className="pt-3.5 border-t border-dashed border-gray-100 grid grid-cols-2 gap-3 text-[9px] text-right">
                      <div className="bg-gray-50/85 p-2 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-bold block">اسم المشروع (Project ID)</span>
                        <span className="font-mono text-gray-700 font-black block mt-0.5 truncate max-w-[120px]">{gatewayHealth?.firebase?.projectId || 'arboon-prod'}</span>
                      </div>
                      <div className="bg-gray-50/85 p-2 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-bold block">مستندات تم فحصها</span>
                        <span className="font-sans text-gray-700 font-black block mt-0.5">{gatewayHealth?.firebase?.docsRead || 0} مستندات</span>
                      </div>
                    </div>
                  </div>

                  {/* Gateway 4: WhatsApp Notification Gateway */}
                  <div className="p-5 rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/20 relative overflow-hidden group space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          gatewayHealth?.whatsapp?.status === 'connected' ? 'bg-emerald-50 text-emerald-600' :
                          gatewayHealth?.whatsapp?.status === 'degraded' ? 'bg-amber-50 text-amber-600' :
                          'bg-red-50 text-red-650'
                        }`}>
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-black text-gray-900">{gatewayHealth?.whatsapp?.label || 'واتساب للإشعارات والتنبيهات'}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5 font-bold truncate max-w-[150px]">Baileys Session Server</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                        gatewayHealth?.whatsapp?.status === 'connected' ? 'bg-green-105 text-green-850' :
                        gatewayHealth?.whatsapp?.status === 'degraded' ? 'bg-amber-105 text-amber-850' :
                        'bg-red-105 text-red-850'
                      }`}>
                        {gatewayHealth?.whatsapp?.status === 'connected' ? 'نشط متصل' :
                         gatewayHealth?.whatsapp?.status === 'degraded' ? 'انتظار الربط' : 'غير نشط'}
                      </span>
                    </div>

                    <div className="pt-3.5 border-t border-dashed border-gray-100 text-[9px] text-right space-y-2">
                      <div className="bg-gray-50/85 p-3 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-bold block">تشخيص الاتصال الحالي للروبوت</span>
                        <span className="font-medium text-gray-700 block mt-1 leading-normal">
                          {gatewayHealth?.whatsapp?.error || 'جلسة إرسال إشعارات التمور والضمان تعمل بشكل سليم للغاية.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Database Storage Capsule */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between h-fit space-y-6">
            <div className="pb-4 border-b border-gray-50">
              <h3 className="text-base font-black text-gray-900">سعة البنية التحتية وقاعدة البيانات</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">تتبع سعة قاعدة البيانات التخزينية وحجم السجلات الكلي</p>
            </div>

            <div className="p-5 bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
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

            <div className="space-y-3 text-[10px] text-gray-500 font-medium bg-gray-50 p-4 rounded-2xl border border-gray-100 leading-relaxed">
              <p className="font-bold text-gray-700 mb-1">تفصيل حجم المستندات النشطة:</p>
              <div className="flex justify-between">
                <span>المستفيدين والشركاء (Users):</span>
                <span className="font-bold text-gray-800">{stats.totalUsers} مستند</span>
              </div>
              <div className="flex justify-between">
                <span>العمليات والمدفوعات (Transactions):</span>
                <span className="font-bold text-gray-800">{stats.allTx.length} مستند</span>
              </div>
              <div className="flex justify-between">
                <span>الدعم وتذاكر المساعدة (Tickets):</span>
                <span className="font-bold text-gray-800">{stats.totalTickets} مستند</span>
              </div>
              <div className="flex justify-between">
                <span>التقييمات والآراء (Reviews):</span>
                <span className="font-bold text-gray-800">{stats.totalReviews} مستند</span>
              </div>
            </div>
          </div>

          {/* Fraud Auto-Moderator Security Scanner */}
          <div className="lg:col-span-3 bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-50 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-red-100">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <h3 className="text-base font-black text-gray-900">الحارس الآلي لمنع الاحتيال</h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">فحص أمني شامل: سرقة هوية • تزوير إيصالات • انتهاك مهلة التسليم</p>
                </div>
              </div>
              <button
                onClick={triggerFraudScan}
                disabled={runningFraudScan}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-l from-red-600 to-orange-600 text-white rounded-2xl font-black text-xs hover:from-red-700 hover:to-orange-700 transition-all shadow-lg shadow-red-100 disabled:opacity-60"
              >
                <ShieldAlert className={`w-4 h-4 ${runningFraudScan ? 'animate-spin' : ''}`} />
                <span>{runningFraudScan ? 'جاري الفحص الأمني...' : 'تشغيل فحص الاحتيال الآن'}</span>
              </button>
            </div>

            {fraudScanResult ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={`p-5 rounded-2xl border ${fraudScanResult.results?.identityTheft?.blocked?.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <UserX className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-black text-gray-800">سرقة الهوية</span>
                  </div>
                  <p className="text-2xl font-black text-gray-900">{fraudScanResult.results?.identityTheft?.flagged || 0}</p>
                  <p className="text-[9px] font-bold text-gray-500 mt-1">حسابات مكررة الهوية الوطنية</p>
                  {fraudScanResult.results?.identityTheft?.blocked?.length > 0 && (
                    <p className="text-[9px] font-black text-red-600 mt-2">🚫 تم حظر {fraudScanResult.results.identityTheft.blocked.length} حساب</p>
                  )}
                </div>

                <div className={`p-5 rounded-2xl border ${fraudScanResult.results?.receiptForgery?.blocked?.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-black text-gray-800">تزوير إيصالات</span>
                  </div>
                  <p className="text-2xl font-black text-gray-900">{fraudScanResult.results?.receiptForgery?.flagged || 0}</p>
                  <p className="text-[9px] font-bold text-gray-500 mt-1">إيصالات مكررة بحسابات مختلفة</p>
                  {fraudScanResult.results?.receiptForgery?.blocked?.length > 0 && (
                    <p className="text-[9px] font-black text-red-600 mt-2">🚫 تم حظر {fraudScanResult.results.receiptForgery.blocked.length} حساب</p>
                  )}
                </div>

                <div className={`p-5 rounded-2xl border ${fraudScanResult.results?.slaViolations?.blocked?.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-black text-gray-800">هروب من التسليم</span>
                  </div>
                  <p className="text-2xl font-black text-gray-900">{fraudScanResult.results?.slaViolations?.flagged || 0}</p>
                  <p className="text-[9px] font-bold text-gray-500 mt-1">تجاوز +7 أيام بلا تواصل</p>
                  {fraudScanResult.results?.slaViolations?.blocked?.length > 0 && (
                    <p className="text-[9px] font-black text-red-600 mt-2">🚫 تم حظر {fraudScanResult.results.slaViolations.blocked.length} حساب</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-300">
                <ShieldCheck className="w-14 h-14 text-gray-200 mb-4" />
                <p className="text-xs font-black text-gray-400">اضغط على زر الفحص لتشغيل الحارس الآلي</p>
                <p className="text-[10px] text-gray-400 font-bold mt-1 max-w-md">
                  يقوم النظام بفحص سرقة الهوية الوطنية المتعددة، تزوير إيصالات الحوالات البنكية، والهروب التام من مهلة التسليم بأكثر من 7 أيام بدون تواصل
                </p>
              </div>
            )}

            {fraudScanResult?.scannedAt && (
              <p className="text-[9px] text-gray-400 font-bold text-center mt-4 pt-4 border-t border-gray-50">
                آخر فحص: {new Date(fraudScanResult.scannedAt).toLocaleString('ar-SA')}
              </p>
            )}
          </div>

        </div>
      )}

      {/* =========================================================================
          OPERATIONAL ACTION MODALS
         ========================================================================= */}

      {/* 1. KYC National ID Rejection Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="text-center">
                 <div className="w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6" />
                 </div>
                 <h3 className="text-base font-black text-gray-900">سبب رفض التوثيق للمستند</h3>
                 <p className="text-gray-400 font-medium text-xs mt-1">يرجى كتابة سبب واضح أو اختيار أحد الأسباب الجاهزة</p>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-2">
                 {[
                   'صورة الهوية غير واضحة',
                   'البيانات لا تطابق الصورة',
                   'الهوية منتهية الصلاحية',
                   'صورة الهوية غير مكتملة أو مقصوصة',
                 ].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setRejectionReason(reason)}
                      className="px-2.5 py-1 bg-red-50/50 text-red-600 rounded-lg text-[9px] font-black hover:bg-red-100 transition-all border border-red-100/30"
                    >
                      {reason}
                    </button>
                 ))}
              </div>
              <textarea 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full bg-gray-50 border border-gray-150 rounded-xl p-3 focus:ring-2 focus:ring-red-100 outline-none transition-all text-xs font-medium text-right"
                placeholder="اكتب تفاصيل إضافية هنا..."
              />
              <div className="flex gap-3">
                 <button 
                   onClick={() => handleRejectVerification(rejectingUser.uid, rejectionReason)}
                   disabled={actionLoading}
                   className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50"
                 >
                   تأكيد رفض الهوية
                 </button>
                 <button 
                   onClick={() => { setRejectingUser(null); setRejectionReason(''); }}
                   className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200 transition-all"
                 >
                   إلغاء
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 2. Manual Bank Transfer Rejection Modal */}
      {rejectingBankTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="text-center">
                 <div className="w-12 h-12 bg-red-50 text-red-655 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Landmark className="w-6 h-6 text-red-600" />
                 </div>
                 <h3 className="text-base font-black text-gray-900">رفض حوالة بنكية يدوية</h3>
                 <p className="text-gray-400 font-medium text-xs mt-1">يرجى توضيح سبب رفض هذه الحوالة ليتمكن المشتري من التعديل</p>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-2">
                 {[
                   'لم يتم استلام المبلغ في الحساب البنكي',
                   'إيصال التحويل المرفق مزور أو خاطئ',
                   'اسم المحوّل لا يطابق صاحب الحساب',
                   'مبلغ الحوالة البنكية المستلم ناقص',
                 ].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setBankTransferRejectionReason(reason)}
                      className="px-2.5 py-1 bg-red-50/50 text-red-600 rounded-lg text-[9px] font-black hover:bg-red-100 transition-all border border-red-100/30"
                    >
                      {reason}
                    </button>
                 ))}
              </div>
              <textarea 
                value={bankTransferRejectionReason}
                onChange={(e) => setBankTransferRejectionReason(e.target.value)}
                rows={3}
                className="w-full bg-gray-50 border border-gray-150 rounded-xl p-3 focus:ring-2 focus:ring-red-100 outline-none transition-all text-xs font-medium text-right"
                placeholder="اكتب تفاصيل إضافية هنا..."
              />
              <div className="flex gap-3">
                 <button 
                   onClick={() => handleRejectBankTransfer(rejectingBankTransfer.id, rejectingBankTransfer.orderId, bankTransferRejectionReason)}
                   disabled={actionLoading}
                   className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50"
                 >
                   تأكيد رفض الحوالة
                 </button>
                 <button 
                   onClick={() => { setRejectingBankTransfer(null); setBankTransferRejectionReason(''); }}
                   className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200 transition-all"
                 >
                   إلغاء
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* 3. Dispute Resolution Confirm Modal */}
      {resolvingDispute && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-right">
              <div className="text-center">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Scale className="w-6 h-6" />
                 </div>
                 <h3 className="text-base font-black text-gray-900">
                   {resolvingDispute.type === 'release' ? 'تسوية النزاع وتحرير الرصيد للبائع' : 'تسوية النزاع وإعادة الرصيد للمشتري'}
                 </h3>
                 <p className="text-gray-400 font-medium text-xs mt-1">
                   {resolvingDispute.type === 'release' 
                     ? 'سيتم دفع وحجز كامل قيمة المعاملة في محفظة البائع البنكية مباشرة.' 
                     : 'سيتم إلغاء المعاملة وإرجاع مبلغ الضمان للبطاقة البنكية الخاصة بالمشتري.'}
                 </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-bold block">ملاحظات وقرار التسوية (سيتم إخطار الأطراف بها):</label>
                <textarea 
                  value={disputeResolutionNotes}
                  onChange={(e) => setDisputeResolutionNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl p-3 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-xs font-medium text-right"
                  placeholder={
                    resolvingDispute.type === 'release' 
                      ? 'مثال: تمت تسوية النزاع لصالح البائع بسبب تقديم كافة إثباتات التوريد الصحيحة والكاملة.' 
                      : 'مثال: تمت تسوية النزاع لصالح المشتري لعدم التزام البائع بالموعد المتفق عليه وتقديم تمور تالفة.'
                  }
                />
              </div>

              <div className="flex gap-3">
                 {resolvingDispute.type === 'release' ? (
                   <button 
                     onClick={() => handleReleaseToSeller(resolvingDispute)}
                     disabled={actionLoading}
                     className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                   >
                     تأكيد تحرير للبائع
                   </button>
                 ) : (
                   <button 
                     onClick={() => handleRefundToBuyer(resolvingDispute)}
                     disabled={actionLoading}
                     className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-xs shadow-lg shadow-red-100 hover:bg-red-700 transition-all disabled:opacity-50"
                   >
                     تأكيد إرجاع للمشتري
                   </button>
                 )}
                 <button 
                   onClick={() => { setResolvingDispute(null); setDisputeResolutionNotes(''); }}
                   className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200 transition-all"
                 >
                   إلغاء
                 </button>
              </div>
           </div>
        </div>
      )}

      <ReportGenerator isOpen={showReports} onClose={() => setShowReports(false)} />
    </div>
  );
};
