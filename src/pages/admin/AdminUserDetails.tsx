import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  collection, query, orderBy, onSnapshot, doc, updateDoc, 
  serverTimestamp, addDoc, where, getDocs, limit, increment 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { UserProfile, Order } from '../../types';
import { 
  ShieldCheck, Search, Star, UserX, UserCheck, ExternalLink, Clock, AlertCircle, Ban, 
  Wallet, X, FileText, Calendar, User, Mail, Smartphone, Activity, CheckCircle2, 
  ArrowUpRight, ArrowDownLeft, Settings, MessageSquare, Send, ArrowRight, CheckSquare, 
  Square, ShieldAlert, Award, Globe
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { recordAuditLog } from '../../lib/notificationService';

export const AdminUserDetails: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { profile, user: currentAuthUser } = useAuth();
  
  // States
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'transactions' | 'actions' | 'verify'>('info');

  // Wallet State
  const [balanceAdjustAmount, setBalanceAdjustAmount] = useState<string>('');
  const [balanceAdjustReason, setBalanceAdjustReason] = useState<string>('');
  const [adjustingBalance, setAdjustingBalance] = useState(false);

  // Administrative Block State
  const [blockingReason, setBlockingReason] = useState('');
  const [submittingBlock, setSubmittingBlock] = useState(false);
  const [showBlockInput, setShowBlockInput] = useState(false);

  // Chat/Conversation State
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Verification Multi-stage checklist
  const [verifyStage1_Name, setVerifyStage1_Name] = useState(false);
  const [verifyStage1_DOB, setVerifyStage1_DOB] = useState(false);
  const [verifyStage2_Image, setVerifyStage2_Image] = useState(false);
  const [verifyStage2_DocCorrect, setVerifyStage2_DocCorrect] = useState(false);
  const [verifyStage3_Nafath, setVerifyStage3_Nafath] = useState(false);
  const [verifyStage4_Pledge, setVerifyStage4_Pledge] = useState(false);
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionInput, setShowRejectionInput] = useState(false);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const isAllVerifiedStagesMet = 
    verifyStage1_Name && 
    verifyStage1_DOB && 
    verifyStage2_Image && 
    verifyStage2_DocCorrect && 
    verifyStage3_Nafath && 
    verifyStage4_Pledge;

  // Real-time user document sync
  useEffect(() => {
    if (!userId) {
      setLoadingUser(false);
      return;
    }

    setLoadingUser(true);
    const userRef = doc(db, 'users', userId);
    
    // Listen to live user profile modifications
    const unsubUser = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const uData = snapshot.data();
        setTargetUser({ uid: snapshot.id, ...uData } as UserProfile);
        
        // Auto-check stages based on what user entered (automated ID and OTP verification)
        const hasId = !!uData.idNumber;
        const isVerified = uData.verificationStatus === 'verified' || uData.isVerified === true;
        if (hasId || isVerified) {
          setVerifyStage1_Name(true);
          setVerifyStage1_DOB(true);
          setVerifyStage2_Image(true);
          setVerifyStage2_DocCorrect(true);
          setVerifyStage3_Nafath(true);
          setVerifyStage4_Pledge(true);
        }
      } else {
        setTargetUser(null);
        toast.error('لم يتم العثور على مستند المستخدم المحدد');
      }
      setLoadingUser(false);
    }, (error) => {
      console.error("Error fetching user document", error);
      toast.error('حدث خطأ أثناء تحميل بيانات العميل المباشرة');
      setLoadingUser(false);
    });

    // Listen to user's orders
    const qOrders1 = query(collection(db, 'orders'), where('buyerId', '==', userId));
    const unsubOrders1 = onSnapshot(qOrders1, (snap1) => {
      const bOrders = snap1.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      
      const qOrders2 = query(collection(db, 'orders'), where('sellerId', '==', userId));
      const unsubOrders2 = onSnapshot(qOrders2, (snap2) => {
        const sOrders = snap2.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        
        // Combine and unique
        const combined = [...bOrders];
        sOrders.forEach(o => {
          if (!combined.some(item => item.id === o.id)) {
            combined.push(o);
          }
        });

        // Sort descending by createdAt
        combined.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
          const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
          return timeB - timeA;
        });

        setOrders(combined);
      });

      return () => unsubOrders2();
    });

    // Listen to financial transactions
    const qTx = query(collection(db, 'transactions'), where('userId', '==', userId));
    const unsubTx = onSnapshot(qTx, (snap) => {
      const txs = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          date: d.createdAt?.toDate?.() || d.date?.toDate?.() || new Date()
        };
      });

      // Sort chronological
      txs.sort((a, b) => b.date.getTime() - a.date.getTime());
      setTransactions(txs);
    });

    return () => {
      unsubUser();
      unsubOrders1();
      unsubTx();
    };
  }, [userId]);

  // Connect/Fetch Chat Room (Ticket)
  const handleInitiateChat = async () => {
    if (!targetUser) return;
    setLoadingChat(true);
    setShowChatPanel(true);

    try {
      // Query existing dynamic support tickets of type live_chat for this user
      const q = query(
        collection(db, 'support_tickets'), 
        where('userId', '==', targetUser.uid), 
        where('type', '==', 'live_chat')
      );
      const snap = await getDocs(q);
      
      let foundTicket: any = null;
      if (!snap.empty) {
        // Try to find open/active one or just use the first one
        foundTicket = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }

      if (!foundTicket) {
        // Create a new real chat support ticket
        const ticketRef = await addDoc(collection(db, 'support_tickets'), {
          userId: targetUser.uid,
          userName: targetUser.displayName || 'عميل',
          userEmail: targetUser.email || '',
          title: 'محادثة إدارية مباشرة مع ' + (targetUser.displayName || 'المستخدم'),
          type: 'live_chat',
          category: 'general',
          status: 'open',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessagePreview: 'بدأت الإدارة المحادثة المباشرة',
          lastMessageSenderId: currentAuthUser?.uid || 'ADMIN'
        });

        foundTicket = {
          id: ticketRef.id,
          userId: targetUser.uid,
          userName: targetUser.displayName || 'عميل',
          userEmail: targetUser.email || '',
          title: 'محادثة إدارية مباشرة مع ' + (targetUser.displayName || 'المستخدم'),
          type: 'live_chat',
          category: 'general',
          status: 'open'
        };
      }

      setActiveTicket(foundTicket);
    } catch (error) {
      console.error("Error setting up chat", error);
      toast.error('فشل في إقامة اتصال المحادثة المباشرة');
    } finally {
      setLoadingChat(false);
    }
  };

  // Sync Chat Messages in true real-time
  useEffect(() => {
    if (!activeTicket?.id) return;

    const qMsg = query(
      collection(db, `support_tickets/${activeTicket.id}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubMsg = onSnapshot(qMsg, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChatMessages(msgs);
      setTimeout(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return unsubMsg;
  }, [activeTicket]);

  // Handle Send Chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeTicket?.id || !currentAuthUser) return;
    
    setSendingMessage(true);
    const textSend = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, `support_tickets/${activeTicket.id}/messages`), {
        ticketId: activeTicket.id,
        senderId: currentAuthUser.uid,
        senderRole: 'admin',
        text: textSend,
        isInternal: false,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'support_tickets', activeTicket.id), {
        lastMessagePreview: textSend,
        lastMessageSenderId: currentAuthUser.uid,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'waiting_for_user'
      });
    } catch (e) {
      console.error(e);
      toast.error('لم نتمكن من إرسال رسالتك');
    } finally {
      setSendingMessage(false);
    }
  };

  // Balance adjust handler
  const handleAdjustBalance = async () => {
    if (!targetUser || !balanceAdjustAmount) return;
    const amount = parseFloat(balanceAdjustAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error('يرجى إدخال مبلغ صحيح ومخالف لـ 0');
      return;
    }

    setAdjustingBalance(true);
    try {
      const userRef = doc(db, 'users', targetUser.uid);
      const currentBalance = targetUser.balance || 0;
      const newBalance = currentBalance + amount;

      await updateDoc(userRef, {
        balance: newBalance
      });

      // Create transaction logs
      await addDoc(collection(db, 'transactions'), {
        userId: targetUser.uid,
        userEmail: targetUser.email,
        amount: Math.abs(amount),
        type: amount > 0 ? 'deposit' : 'withdrawal',
        description: balanceAdjustReason || (amount > 0 ? 'إيداع إداري للمحفظة' : 'سحب إداري من المحفظة'),
        status: 'completed',
        createdAt: serverTimestamp()
      });

      // Save Audit Log
      await recordAuditLog({
        action: 'adjust_balance',
        targetId: targetUser.uid,
        details: { amount, reason: balanceAdjustReason || 'لا يوجد', oldBalance: currentBalance, newBalance }
      });

      toast.success('تم تعديل رصيد المحفظة وحفظ السجلات المالية بنجاح للعميل');
      setBalanceAdjustAmount('');
      setBalanceAdjustReason('');
    } catch (err: any) {
      console.error(err);
      toast.error('حدثت مشكلة أثناء تعديل الرصيد الوطني');
    } finally {
      setAdjustingBalance(false);
    }
  };

  // Promote / Demote Admin
  const handleToggleAdminStatus = async () => {
    if (!targetUser) return;
    try {
      const nextIsAdmin = !targetUser.isAdmin;
      await updateDoc(doc(db, 'users', targetUser.uid), {
        isAdmin: nextIsAdmin
      });
      await recordAuditLog({
        action: nextIsAdmin ? 'promote_admin' : 'demote_admin',
        targetId: targetUser.uid,
        details: { displayName: targetUser.displayName }
      });
      toast.success(nextIsAdmin ? 'تم ترقية المستخدم لمدير نظام بنجاح' : 'تم سحب صلاحيات الإدارة من العميل');
    } catch (e) {
      console.error(e);
      toast.error('بسبب صلاحيات الأمان، تعذر تغيير رتبة المستخدم');
    }
  };

  // Feature Toggle (Elite Seller badge)
  const handleToggleEliteStatus = async () => {
    if (!targetUser) return;
    try {
      const nextVal = !targetUser.isFeatured;
      await updateDoc(doc(db, 'users', targetUser.uid), {
        isFeatured: nextVal
      });
      await recordAuditLog({
        action: nextVal ? 'toggle_featured_on' : 'toggle_featured_off',
        targetId: targetUser.uid,
        details: { flag: nextVal }
      });
      toast.success(nextVal ? 'تم تمييز العميل ورفع تقييمه للنخبة' : 'تم إلغاء حالة التاجر المتميز');
    } catch (e) {
      console.error(e);
      toast.error('تعذر تغيير رتبة تاجر النخبة المتميز');
    }
  };

  // Block account toggle
  const handleBlockUser = async () => {
    if (!targetUser) return;
    if (!showBlockInput) {
      setShowBlockInput(true);
      return;
    }

    if (!blockingReason.trim()) {
      toast.error('يرجى تحديد سبب تعليق وحظر العضوية');
      return;
    }

    setSubmittingBlock(true);
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        isBlocked: true,
        blockReason: blockingReason
      });

      await recordAuditLog({
        action: 'block_user',
        targetId: targetUser.uid,
        details: { reason: blockingReason }
      });

      toast.error('تم حظر وتجميد الحساب فورياً!');
      setShowBlockInput(false);
      setBlockingReason('');
    } catch (e) {
      console.error(e);
      toast.error('تعذر حظر الحساب');
    } finally {
      setSubmittingBlock(false);
    }
  };

  // Unblock account
  const handleUnblockUser = async () => {
    if (!targetUser) return;
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        isBlocked: false,
        blockReason: null
      });

      await recordAuditLog({
        action: 'unblock_user',
        targetId: targetUser.uid,
        details: { action: 'unblock' }
      });

      toast.success('تم فك الحظر عن المستخدم وتفعيل حق الدخول');
    } catch (e) {
      console.error(e);
    }
  };

  // Stage-based verification process submit
  const handleCompleteVerificationWizard = async () => {
    if (!targetUser || !isAllVerifiedStagesMet) return;
    setIsSubmittingVerify(true);

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        verificationStatus: 'verified',
        isVerified: true,
        trustLevel: 100,
        verifyStagesCompleted: {
          timestamp: new Date().toISOString(),
          by: currentAuthUser?.email || 'admin'
        }
      });

      // Insert transaction/system verification log
      await addDoc(collection(db, 'system_logs'), {
        action: 'national_verification_approved',
        targetId: targetUser.uid,
        performedBy: currentAuthUser?.email || 'admin',
        timestamp: serverTimestamp(),
        severity: 'info',
        details: 'تم استيفاء وتمرير كافة الفحوصات الأمنية والمدنية الرقمية بـ 6 مراحل للعميل بنجاح'
      });

      await recordAuditLog({
        action: 'user_verified_stages',
        targetId: targetUser.uid,
        details: { status: 'verified', stagesCovered: 6 }
      });

      toast.success('عظيم! تم اكمال مراحل التوثيق الوطني الستة وترقية حساب العميل إلى "موثق" بنجاح');
      setActiveTab('info');
    } catch (e) {
      console.error(e);
      toast.error('تعذر اكمال وتخزين بيانات التوثيق');
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  // Reject / Cancel verification 
  const handleRejectVerification = async () => {
    if (!targetUser) return;
    if (!showRejectionInput) {
      setShowRejectionInput(true);
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('يرجى كتابة سبب معلل لرفض التوثيق');
      return;
    }

    setIsSubmittingReject(true);
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        verificationStatus: 'unverified',
        isVerified: false,
        trustLevel: increment(-10),
        verificationRejectReason: rejectionReason
      });

      await addDoc(collection(db, 'system_logs'), {
        action: 'national_verification_rejected',
        targetId: targetUser.uid,
        performedBy: currentAuthUser?.email || 'admin',
        timestamp: serverTimestamp(),
        severity: 'warning',
        details: `مرفوض بسبب: ${rejectionReason}`
      });

      toast.success('تم رفض التوثيق وإرسال التنبيه للعميل بنجاح');
      setShowRejectionInput(false);
      setRejectionReason('');
    } catch (e) {
      console.error(e);
      toast.error('تعذر تطبيق عملية الرفض');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#080d15] flex flex-col items-center justify-center text-gray-400 gap-2 p-6" dir="rtl">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-100 dark:shadow-blue-900/10"></div>
        <p className="text-sm font-black mt-2">جاري استيراد وتدقيق البيانات الحية لمستند العميل...</p>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#080d15] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
         <div className="bg-white dark:bg-gray-950 p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-xl max-w-md w-full">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">مستند غير موجود</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed mb-6">واجهنا خطأ أثناء تحميل سجل المستخدم. قد يكون الحساب تم إزالته أو أن المعرف المعطى في العنوان البريد الرقمي غير صالح.</p>
            <button 
              onClick={() => navigate('/admin/users')}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs hover:bg-blue-700 transition"
            >
              العودة لقائمة المستخدمين
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#070b11] text-right pb-24" dir="rtl">
      
      {/* Top Header Navigation */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 sticky top-0 z-40 transition-colors">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => navigate('/admin/users')}
                 className="p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl transition border border-gray-100 dark:border-gray-800"
                 title="العودة لقائمة إدارة المستخدمين"
               >
                  <ArrowRight className="w-5 h-5" />
               </button>
               <div>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-mono px-2 py-0.5 rounded-lg font-black uppercase">إدارة العميل</span>
                     <span className="text-gray-300 dark:text-gray-700 font-bold">/</span>
                     <span className="text-xs font-bold text-gray-400 dark:text-gray-500 font-mono">#{targetUser.userShortId || 'ID'}</span>
                  </div>
                  <h1 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">{targetUser.displayName}</h1>
               </div>
            </div>

            <div className="flex items-center gap-2">
               {/* Support chat init action */}
               <button 
                 onClick={handleInitiateChat}
                 className="flex items-center gap-1.5 px-4.5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-100 dark:shadow-none transition-all"
               >
                  <MessageSquare className="w-4 h-4" />
                  بدء محادثة مباشرة
               </button>

               <button 
                 onClick={() => navigate('/admin')}
                 className="flex items-center gap-1.5 px-3.5 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition"
               >
                  لوحة التحكم
               </button>
            </div>
         </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
         
         {/* Left Column Profile Summary Info card */}
         <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm p-6 space-y-6 lg:sticky lg:top-24">
            <div className="text-center relative pb-6 border-b border-gray-50 dark:border-gray-900">
               {targetUser.isBlocked && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-100 text-red-600 text-[9px] font-black px-3 py-1 rounded-full border border-red-200 shadow-sm animate-pulse">
                     الحساب محظور وموقوف
                  </span>
               )}
               <img 
                 src={targetUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'} 
                 className="w-24 h-24 rounded-[2rem] object-cover mx-auto ring-4 ring-gray-50 dark:ring-gray-900 shadow-md mb-4"
                 alt=""
               />
               <div className="flex items-center justify-center gap-2">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white text-center">{targetUser.displayName}</h2>
                  {targetUser.isFeatured && (
                     <Award className="w-5 h-5 text-orange-400 fill-current" title="تاجر متميز" />
                  )}
               </div>
               <p className="text-xs text-gray-400 dark:text-gray-500 font-bold font-mono mt-1">{targetUser.email}</p>
            </div>

            {/* General Fields with Real Value checks */}
            <div className="space-y-4">
               <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-900/45 rounded-2xl">
                  <div className="flex items-center gap-2">
                     <Wallet className="w-4 h-4 text-emerald-500" />
                     <span className="text-xs font-bold text-gray-400">الرصيد الاسمي</span>
                  </div>
                  <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 font-mono italic">
                     {(targetUser.balance || 0).toLocaleString()} ر.س
                  </span>
               </div>

               <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-900/45 rounded-2xl">
                  <div className="flex items-center gap-2">
                     <Smartphone className="w-4 h-4 text-blue-500" />
                     <span className="text-xs font-bold text-gray-400">رقم الهاتف</span>
                  </div>
                  <span className="font-bold text-xs text-gray-800 dark:text-gray-200 font-mono">
                     {targetUser.phoneNumber || 'غير مدخل'}
                  </span>
               </div>

               <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-900/45 rounded-2xl">
                  <div className="flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4 text-blue-500" />
                     <span className="text-xs font-bold text-gray-400">التوثيق الوطني</span>
                  </div>
                  <div>
                    {targetUser.verificationStatus === 'verified' ? (
                       <span className="text-[9px] font-black text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-lg border border-green-100 dark:border-green-900/30">
                          موثق (أبشر)
                       </span>
                    ) : targetUser.verificationStatus === 'pending' ? (
                       <span className="text-[9px] font-black text-orange-600 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded-lg border border-orange-100 dark:border-orange-900/30">
                          قيد المراجعة والتدقيق
                       </span>
                    ) : (
                       <span className="text-[9px] font-black text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-900/30">
                          غير موثق
                       </span>
                    )}
                  </div>
               </div>

               {targetUser.idNumber && (
                  <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-900/45 rounded-2xl">
                     <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-gray-400">الهوية الوطنية</span>
                     </div>
                     <span className="font-bold text-xs font-mono text-gray-900 dark:text-gray-200">{targetUser.idNumber}</span>
                  </div>
               )}

               <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-900/45 rounded-2xl">
                  <div className="flex items-center gap-2">
                     <Calendar className="w-4 h-4 text-gray-400" />
                     <span className="text-xs font-bold text-gray-400">تاريخ الانضمام</span>
                  </div>
                  <span className="font-bold text-xs text-gray-700 dark:text-gray-300">
                     {targetUser.createdAt ? new Date(targetUser.createdAt.toDate()).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير متوفر'}
                  </span>
               </div>

               <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-900/45 rounded-2xl">
                  <div className="flex items-center gap-2">
                     <Activity className="w-4 h-4 text-blue-500" />
                     <span className="text-xs font-bold text-gray-400">مستوى الثقة في المنصة</span>
                  </div>
                  <span className="font-black text-xs text-blue-600 dark:text-blue-400 font-mono">
                     %{targetUser.trustLevel || 10}
                  </span>
               </div>
            </div>

            {/* رابط عرض صفحة العضو العامة */}
            <div className="pt-2">
               <Link
                  to={`/seller/${targetUser.uid}`}
                  className="w-full py-3.5 px-4 bg-blue-50/50 dark:bg-blue-950/15 border border-blue-100/60 dark:border-blue-900/35 hover:bg-blue-100/40 dark:hover:bg-blue-900/25 rounded-2xl flex items-center justify-between transition-all"
               >
                  <div className="flex items-center gap-2">
                     <Globe className="w-4 h-4 text-blue-500" />
                     <span className="text-xs font-black text-gray-700 dark:text-gray-300">عرض الصفحة الشخصية للعامة</span>
                  </div>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-100/50 dark:bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-200/50 dark:border-blue-800/40 flex items-center gap-1">
                     <span>زيارة الصفحة</span>
                     <ExternalLink className="w-3 h-3" />
                  </span>
               </Link>
            </div>

            {/* Block message if blocked */}
            {targetUser.isBlocked && targetUser.blockReason && (
               <div className="p-4 bg-red-50 border-2 border-red-100 rounded-3xl text-right">
                  <p className="text-[9px] font-black text-red-600 uppercase mb-1">سبب ومخالفة الحظر</p>
                  <p className="text-xs font-bold text-gray-700">{targetUser.blockReason}</p>
               </div>
            )}
         </div>

         {/* Right Columns Information & Interactive Panels */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Tabs Navigation */}
            <div className="flex bg-white dark:bg-gray-950 p-[5px] rounded-2xl border border-gray-100 dark:border-gray-900 shadow-sm gap-2">
               {[
                 { id: 'info', label: '📊 ملخص و إحصائيات' },
                 { id: 'verify', label: '🔒 التوثيق الوطني (بمراحل)' },
                 { id: 'orders', label: `📦 الطلبات (${orders.length})` },
                 { id: 'transactions', label: `💳 المحفظة المالية (${transactions.length})` },
                 { id: 'actions', label: '⚙️ التحكم الإداري' }
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`flex-1 py-3 px-1 rounded-xl text-xs font-black transition-all ${
                     activeTab === tab.id 
                       ? 'bg-blue-600 text-white shadow-md shadow-blue-100 dark:shadow-none' 
                       : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                   }`}
                 >
                    {tab.label}
                 </button>
               ))}
            </div>

            {/* Dynamic Content Panels */}
            <div className="space-y-6">
               
               {/* 1. Tab Overview / General Info */}
               {activeTab === 'info' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     
                     {/* Mini Status Card */}
                     <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-900 shadow-sm">
                        <h4 className="font-black text-gray-900 dark:text-white mb-2 text-sm">أداء التعاملات</h4>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-400 font-bold">إجمالي الصفقات الجارية</span>
                              <span className="font-black text-gray-900 dark:text-white font-mono">{orders.filter(o => o.status === 'active').length}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-400 font-bold">إجمالي الصفقات المكتملة</span>
                              <span className="font-black text-gray-900 dark:text-white font-mono">{orders.filter(o => o.status === 'completed').length}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-400 font-bold">رصيد المحفظة الاسمي الحالي</span>
                              <span className="font-black text-emerald-600 font-mono">{(targetUser.balance || 0).toLocaleString()} ر.س</span>
                           </div>
                        </div>
                     </div>

                     {/* Profile Completion/Quality */}
                     <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-900 shadow-sm flex flex-col justify-between">
                        <div>
                           <h4 className="font-black text-gray-900 dark:text-white text-sm mb-1">الرتبة والامتيازات</h4>
                           <p className="text-[10px] text-gray-400 font-bold">الحسابات الحاصلة على شارات خاصة تتمتع بأولوية في محركات استعراض صفقات التمور</p>
                        </div>

                        <div className="flex gap-2 pt-4">
                           {targetUser.isAdmin && (
                              <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1">
                                 <ShieldCheck className="w-4 h-4" /> مدير نظام
                              </span>
                           )}
                           {targetUser.isFeatured ? (
                              <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1">
                                 <Star className="w-4 h-4 fill-current" /> تاجر تميز
                              </span>
                           ) : (
                              <span className="bg-gray-50 text-gray-400 border border-gray-100 text-[10px] font-bold px-3 py-1.5 rounded-xl">
                                 حساب اعتيادي (عام)
                              </span>
                           )}
                        </div>
                     </div>

                     {/* Profile details text summaries */}
                     <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-900 shadow-sm md:col-span-2 space-y-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2.5 bg-blue-50 dark:bg-blue-950/35 text-blue-600 dark:text-blue-400 rounded-xl">
                              <Activity className="w-5 h-5" />
                           </div>
                           <div>
                              <h4 className="font-black text-gray-900 dark:text-white text-sm">بيانات السجل الوطني المرفقة</h4>
                              <p className="text-[10px] text-gray-400 font-bold">تم المطابقة مع مصادر التوثيق الرسمية في المملكة العربية السعودية</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                           <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                              <p className="text-[10px] text-gray-400 font-bold mb-1">المعرف القصير للمستخدم</p>
                              <p className="font-black text-gray-800 dark:text-gray-200 font-mono">#{targetUser.userShortId || 'لا يوجد'}</p>
                           </div>
                           <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                              <p className="text-[10px] text-gray-400 font-bold mb-1">حالة الحساب</p>
                              <p className={`font-black ${targetUser.isBlocked ? 'text-red-650' : 'text-green-600'}`}>
                                 {targetUser.isBlocked ? 'معلق وموقوف للمخالفة' : 'شغال ونشط'}
                              </p>
                           </div>
                           <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                              <p className="text-[10px] text-gray-400 font-bold mb-1">أكواد الدعوة المستخدمة</p>
                              <p className="font-bold text-gray-800 dark:text-gray-200">{targetUser.referredBy ? 'تمت دعوته ببرود كود' : 'تسجيل مباشر'}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* 2. Tab Verification - The step-by-step interactive stages checklist */}
               {activeTab === 'verify' && (
                  <div className="bg-white dark:bg-gray-950 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm space-y-6">
                     
                     <div className="flex items-start justify-between border-b border-gray-50 dark:border-gray-900 pb-4">
                        <div>
                           <div className="flex items-center gap-2">
                              <Award className="w-5 h-5 text-blue-600" />
                              <h3 className="text-base font-black text-gray-900 dark:text-white">بوابة التوثيق والمطابقة الرسمية (6 مراحل)</h3>
                           </div>
                           <p className="text-gray-400 dark:text-gray-500 font-semibold text-xs mt-1">يجب مراجعة مستندات العميل والتبديل اليدوي بين البنود لتلبية الشروط بالكامل قبل تمكينه من رتبة "موثق"</p>
                        </div>
                        
                        {targetUser.verificationStatus === 'verified' && (
                           <div className="bg-green-50 dark:bg-green-950/20 text-green-600 border border-green-100 dark:border-green-900/30 px-3.5 py-2 rounded-xl text-xs font-black">
                              هذا الحساب موثق ومكتمل بالمرحلة
                           </div>
                        )}
                     </div>

                     <div className="space-y-6 pt-2 text-right">
                        
                        {/* Stage 1 Checkboxes */}
                        <div className="space-y-3 bg-gray-50 dark:bg-gray-900/60 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                           <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              المرحلة الأولى: التحقق المدني والهاتف
                           </h4>
                           
                           <div className="space-y-2.5">
                              <button 
                                onClick={() => setVerifyStage1_Name(!verifyStage1_Name)}
                                className="flex items-start gap-3 text-right w-full p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-950/80 transition"
                              >
                                 <div className="mt-0.5">
                                    {verifyStage1_Name ? (
                                       <CheckSquare className="w-4 h-4 text-blue-600 fill-blue-50 dark:fill-none" />
                                    ) : (
                                       <Square className="w-4 h-4 text-gray-300" />
                                    )}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-gray-850 dark:text-gray-200">الاسم والبيانات مطابقة بالكامل للهوية</p>
                                    <p className="text-[10px] text-gray-400">فحص اللقب الكلي والاسم الثلاثي ومطابقته لنفس الهيئة المستخرجة</p>
                                 </div>
                              </button>

                              <button 
                                onClick={() => setVerifyStage1_DOB(!verifyStage1_DOB)}
                                className="flex items-start gap-3 text-right w-full p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-950/80 transition"
                              >
                                 <div className="mt-0.5">
                                    {verifyStage1_DOB ? (
                                       <CheckSquare className="w-4 h-4 text-blue-600 fill-blue-50 dark:fill-none" />
                                    ) : (
                                       <Square className="w-4 h-4 text-gray-300" />
                                    )}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-gray-850 dark:text-gray-200">صلاحية تاريخ انتهاء الهوية ورقم الجوال</p>
                                    <p className="text-[10px] text-gray-400">التحقق من صلاحية تاريخ الميلاد المدخل في النظام وخلوه من التعارض</p>
                                 </div>
                              </button>
                           </div>
                        </div>

                        {/* Stage 2 Checkboxes */}
                        <div className="space-y-3 bg-gray-50 dark:bg-gray-900/60 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                           <h4 className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              المرحلة الثانية: الربط الرقمي والتحقق من الهوية الوطنية
                           </h4>
                           
                           <div className="space-y-2.5">
                              <button 
                                onClick={() => setVerifyStage2_Image(!verifyStage2_Image)}
                                className="flex items-start gap-3 text-right w-full p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-950/80 transition"
                              >
                                 <div className="mt-0.5">
                                    {verifyStage2_Image ? (
                                       <CheckSquare className="w-4 h-4 text-blue-600 fill-blue-50 dark:fill-none" />
                                    ) : (
                                       <Square className="w-4 h-4 text-gray-300" />
                                    )}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-gray-850 dark:text-gray-200">التحقق الرقمي من هوية العميل عبر بوابة يمام/نفاذ</p>
                                    <p className="text-[10px] text-gray-400">التأكد الخبير من تطابق رقم الهوية والرمز المؤقت الرقمي مباشرة دون ملفات مرفوعة يدوياً</p>
                                 </div>
                              </button>

                              <button 
                                onClick={() => setVerifyStage2_DocCorrect(!verifyStage2_DocCorrect)}
                                className="flex items-start gap-3 text-right w-full p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-950/80 transition"
                              >
                                 <div className="mt-0.5">
                                    {verifyStage2_DocCorrect ? (
                                       <CheckSquare className="w-4 h-4 text-blue-600 fill-blue-50 dark:fill-none" />
                                    ) : (
                                       <Square className="w-4 h-4 text-gray-300" />
                                    )}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-gray-850 dark:text-gray-200">صحة التطابق مع رقم الجوال المرتبط بالهوية الوطنية</p>
                                    <p className="text-[10px] text-gray-400">التحقق من أن رقم المستلم في الهيئة يطابق كود التأكيد المستلم من مزود الخدمة الموحد</p>
                                 </div>
                              </button>
                           </div>
                        </div>

                        {/* Stage 3 and 4 Checkboxes */}
                        <div className="space-y-3 bg-gray-50 dark:bg-gray-900/60 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                           <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                              المرحلة الثالثة والرابعة: التبليغ الآلي لنفاذ / التعهد القانوني
                           </h4>
                           
                           <div className="space-y-2.5">
                              <button 
                                onClick={() => setVerifyStage3_Nafath(!verifyStage3_Nafath)}
                                className="flex items-start gap-3 text-right w-full p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-950/80 transition"
                              >
                                 <div className="mt-0.5">
                                    {verifyStage3_Nafath ? (
                                       <CheckSquare className="w-4 h-4 text-blue-600 fill-blue-50 dark:fill-none" />
                                    ) : (
                                       <Square className="w-4 h-4 text-gray-300" />
                                    )}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-gray-850 dark:text-gray-200">سريان رمز التوثيق من القنوات الفيدرالية أبشر</p>
                                    <p className="text-[10px] text-gray-400">التأكد من اتمام كود الدخول والتوثيق للمستخدم بالبوابات الفيدرالية</p>
                                 </div>
                              </button>

                              <button 
                                onClick={() => setVerifyStage4_Pledge(!verifyStage4_Pledge)}
                                className="flex items-start gap-3 text-right w-full p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-950/80 transition"
                              >
                                 <div className="mt-0.5">
                                    {verifyStage4_Pledge ? (
                                       <CheckSquare className="w-4 h-4 text-blue-600 fill-blue-50 dark:fill-none" />
                                    ) : (
                                       <Square className="w-4 h-4 text-gray-300" />
                                    )}
                                 </div>
                                 <div>
                                    <p className="text-xs font-black text-gray-850 dark:text-gray-200">التعهد والمطابقة الإدارية النهائية للموظف المسؤول</p>
                                    <p className="text-[10px] text-gray-400">تحمل الإدارة المسؤولة صحة المستندات ومطابقتها للمعايير لضمان أمان التداول للأخرين</p>
                                 </div>
                              </button>
                           </div>
                        </div>

                        {/* Output Actions Section */}
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-900 flex flex-col sm:flex-row gap-3">
                           
                           {/* Approve action button - strictly disabled until all 6 phases checked */}
                           <button 
                             onClick={handleCompleteVerificationWizard}
                             disabled={!isAllVerifiedStagesMet || isSubmittingVerify}
                             className={`flex-1 py-4 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                               isAllVerifiedStagesMet 
                               ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100 dark:shadow-none' 
                               : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                             }`}
                           >
                              {isSubmittingVerify ? (
                                 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                 <UserCheck className="w-4 h-4" />
                              )}
                              <span>إكمال وتوثيق الحساب رسمياً (تفعيل الشارة)</span>
                           </button>

                           {/* Reject verification flow */}
                           <button 
                             onClick={handleRejectVerification}
                             className="px-6 py-4 bg-red-50 hover:bg-red-100 text-red-650 rounded-2xl text-xs font-black border border-red-100 transition"
                           >
                              رفض التوثيق وإبلاغ المستخدم
                           </button>
                        </div>

                        {/* Reject reasoning overlay inputs */}
                        {showRejectionInput && (
                           <div className="p-5 bg-red-50/50 border border-red-100 rounded-3xl space-y-3">
                              <label className="block text-xs font-black text-red-600">اكتب سبب رفض التوثيق بوضوح للعميل:</label>
                              <textarea 
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder="مثال: صورة الهوية الوطنية غير واضحة المعالم، يرجى إعادة الرفع وبصيغة ملونة..."
                                className="w-full bg-white border border-red-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-red-200 text-right"
                                rows={2}
                              />
                              <button 
                                onClick={handleRejectVerification}
                                disabled={isSubmittingReject}
                                className="px-5 py-2.5 bg-red-600 text-white font-black text-xs rounded-xl shadow-md"
                              >
                                 {isSubmittingReject ? 'جاري الحفظ والرفض...' : 'تأكيد الرفض النهائي'}
                              </button>
                           </div>
                        )}

                        {/* Disclaimer if stages not fully met */}
                        {!isAllVerifiedStagesMet && (
                           <div className="flex items-center gap-2 text-orange-500 bg-orange-50 dark:bg-orange-950/20 px-4 py-3 rounded-2xl border border-orange-100 dark:border-orange-900/30 text-xs font-bold leading-relaxed">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>تنبيه أمان: لا يسمح النظام بتفعيل زر "التوثيق الرسمي" للأفراد حتى يستكمل موظف الإدارة مراجعة وتدقيق الفحوصات الجنائية والمدنية الستة المذكورة أعلاه.</span>
                           </div>
                        )}
                     </div>

                  </div>
               )}

               {/* 3. Tab User Orders list */}
               {activeTab === 'orders' && (
                  <div className="space-y-4">
                     {orders.length === 0 ? (
                        <div className="bg-white dark:bg-gray-950 p-12 rounded-3xl border border-gray-100 dark:border-gray-900 text-center text-gray-450 font-bold text-xs">
                           <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-300" />
                           <p>لا يوجد أي طلبات أو تعاملات مسجلة لهذا العميل حالياً</p>
                        </div>
                     ) : (
                        orders.map(order => {
                           const isBuyer = order.buyerId === targetUser.uid;
                           return (
                              <div 
                                key={order.id}
                                className="bg-white dark:bg-gray-950 rounded-2xl p-5 border border-gray-100 dark:border-gray-900 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-100 dark:hover:border-blue-900/30 transition-all cursor-pointer text-right"
                                onClick={() => navigate(`/order/${order.id}`)}
                              >
                                 <div className="flex items-center gap-3.5 text-right">
                                    <div className={`p-3 rounded-xl ${isBuyer ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'}`}>
                                       {isBuyer ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                    </div>
                                    <div className="text-right">
                                       <div className="flex items-center gap-2">
                                          <p className="font-bold text-sm text-gray-900 dark:text-white">{order.title || 'عرض شراء صفقات تمور'}</p>
                                          <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${
                                             isBuyer ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                          }`}>
                                             {isBuyer ? 'مشتري' : 'بائع ومورد'}
                                          </span>
                                       </div>
                                       <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold mt-1">
                                          <span className="font-mono">ID: {order.id?.slice(0, 8)}</span>
                                          <span>•</span>
                                          <span className="flex items-center gap-1">
                                             <Calendar className="w-3 h-3" />
                                             {order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) : '---'}
                                          </span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-none pt-2 md:pt-0 border-gray-50 dark:border-gray-950">
                                    <div className="text-right">
                                       <p className="text-[10px] text-gray-400 font-bold">المبلغ الكلي</p>
                                       <p className="font-black text-sm text-gray-900 dark:text-white font-mono italic">{(order.price || order.totalPrice || 0).toLocaleString()} ر.س</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                       order.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/20 dark:border-green-905/30' :
                                       order.status === 'active' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-905/30' :
                                       order.status === 'cancelled' ? 'bg-red-50 text-red-610 border-red-100' :
                                       'bg-orange-50 text-orange-600 border-orange-100'
                                    }`}>
                                       {order.status === 'completed' ? 'مكتمل' : 
                                        order.status === 'active' ? 'نشط / قيد التنفيذ' : 
                                        order.status === 'cancelled' ? 'ملغي' : 
                                        order.status === 'disputed' ? 'نزاع مفتوح' : 'بانتظار الدفع'}
                                    </span>
                                 </div>
                              </div>
                           )
                        })
                     )}
                  </div>
               )}

               {/* 4. Tab User transactions list */}
               {activeTab === 'transactions' && (
                  <div className="space-y-4">
                     {transactions.length === 0 ? (
                        <div className="bg-white dark:bg-gray-950 p-12 rounded-3xl border border-gray-100 dark:border-gray-900 text-center text-gray-450 font-bold text-xs">
                           <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30 text-gray-350" />
                           <p>لا يوجد أي تعاملات مالية مسجلة في محفظة المستخدم حتى الآن</p>
                        </div>
                     ) : (
                        transactions.map(tx => {
                           const isDeposit = tx.type === 'deposit';
                           return (
                              <div 
                                key={tx.id}
                                className="bg-white dark:bg-gray-950 rounded-2xl p-5 border border-gray-100 dark:border-gray-900 shadow-sm flex justify-between items-center text-right"
                              >
                                 <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${isDeposit ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-red-50 text-red-600 dark:bg-red-950/30'}`}>
                                       {isDeposit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                    </div>
                                    <div className="text-right">
                                       <p className="font-bold text-xs text-gray-900 dark:text-white">{tx.description || (isDeposit ? 'إيداع رصيد بالمحفظة' : 'سحب رصيد مالي خارج المنصة')}</p>
                                       <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold mt-1">
                                          <span className="font-mono">ID: {tx.id?.slice(0, 8)}</span>
                                          <span>•</span>
                                          <span>{tx.date ? new Date(tx.date).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---'}</span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="text-left font-sans">
                                    <p className={`font-black text-xs font-mono italic ${isDeposit ? 'text-green-600' : 'text-red-605'}`}>
                                       {isDeposit ? '+' : '-'}{Number(tx.amount || 0).toLocaleString()} ر.س
                                    </p>
                                    <span className="text-[8px] font-black text-green-500 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 px-1.5 py-0.5 rounded-md">مقبول ومقيد</span>
                                 </div>
                              </div>
                           )
                        })
                     )}
                  </div>
               )}

               {/* 5. Tab Administrative Actions & Controls */}
               {activeTab === 'actions' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                     
                     {/* Wallet Adjustment Panel */}
                     <div className="bg-white dark:bg-gray-950 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm space-y-4 text-right">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                              <Wallet className="w-5 h-5" />
                           </div>
                           <div className="text-right">
                              <h4 className="font-black text-sm text-gray-900 dark:text-white">تعديل المحفظة ورصيد العميل حباً</h4>
                              <p className="text-[10px] text-gray-450 font-semibold">شحن أو خصم مالي يدوي من رصيد المحفظة الاسمي المتداول بالمنصة</p>
                           </div>
                        </div>

                        <div className="space-y-3 pt-2">
                           <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">المبلغ للتعديل بالريال (ر.س)</label>
                              <input 
                                type="number"
                                placeholder="مثال: 1000 للإضافة، أو -1000 للخصم..."
                                value={balanceAdjustAmount}
                                onChange={e => setBalanceAdjustAmount(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-105/90 dark:border-gray-800 rounded-xl px-4 py-3 text-xs font-black text-right font-mono"
                              />
                           </div>

                           <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">السبب والتبرير في السجلات الوطنية</label>
                              <textarea 
                                placeholder="اكتب في حال التعويض عن نزاع أو شحن كود ترويجي ترحيبي..."
                                value={balanceAdjustReason}
                                onChange={e => setBalanceAdjustReason(e.target.value)}
                                rows={2}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-105/90 dark:border-gray-800 rounded-xl p-3 text-xs font-bold text-right outline-none focus:bg-white"
                              />
                           </div>

                           <button 
                             onClick={handleAdjustBalance}
                             disabled={adjustingBalance || !balanceAdjustAmount}
                             className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs transition shadow-md disabled:opacity-50"
                           >
                              {adjustingBalance ? 'جاري قيد وتغيير الأرصدة...' : 'حفظ وتطبيق العملية المالية فوراً'}
                           </button>
                        </div>
                     </div>

                     {/* Profile Status Controls */}
                     <div className="bg-white dark:bg-gray-950 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-900 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
                              <Settings className="w-5 h-5" />
                           </div>
                           <div className="text-right">
                              <h4 className="font-black text-sm text-gray-900 dark:text-white">الصلاحيات والامتيازات والعقوبات</h4>
                              <p className="text-[10px] text-gray-400 font-semibold">إدارة امتيازات ورتبة العضوية، أو استبعاد وإيقاف الحساب للمخالفة</p>
                           </div>
                        </div>

                        <div className="space-y-3 pt-2 text-right">
                           
                           {/* Promote Admin Toggle */}
                           <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                              <div>
                                 <p className="text-xs font-black text-gray-900 dark:text-white">عضوية لوحة الإدارة (Admin)</p>
                                 <p className="text-[9px] text-gray-400 font-semibold">إعطاء صلاحية كاملة للدخول لوحدة التحكم الإدارية لتذكرة المراجعات</p>
                              </div>
                              <button 
                                onClick={handleToggleAdminStatus}
                                className={`px-3 py-1.5 rounded-xl text-[9px] font-black transition ${
                                   targetUser.isAdmin 
                                     ? 'bg-purple-600 text-white' 
                                     : 'bg-white dark:bg-gray-850 text-gray-400 dark:text-gray-400 border border-gray-100 dark:border-gray-700'
                                }`}
                              >
                                 {targetUser.isAdmin ? 'مدير نظام' : 'ترقية لمدير'}
                              </button>
                           </div>

                           {/* Featured Seller Badge Toggle */}
                           <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                              <div>
                                 <p className="text-xs font-black text-gray-900 dark:text-white">تاجر صف النخبة المتميز</p>
                                 <p className="text-[9px] text-gray-400 font-semibold">تثبيت شارة التميز الذهبية بجانب منتجاته لزيادة ثقة المشترين في التمور</p>
                              </div>
                              <button 
                                onClick={handleToggleEliteStatus}
                                className={`px-3 py-1.5 rounded-xl text-[9px] font-black transition ${
                                   targetUser.isFeatured 
                                     ? 'bg-orange-500 text-white' 
                                     : 'bg-white dark:bg-gray-850 text-gray-400 dark:text-gray-400 border border-gray-100 dark:border-gray-700'
                                }`}
                              >
                                 {targetUser.isFeatured ? 'موقعه متميز' : 'منح التميز'}
                              </button>
                           </div>

                           {/* Block account Toggle */}
                           <div className="flex flex-col bg-gray-50 dark:bg-gray-900/40 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 gap-3">
                              <div className="flex items-center justify-between">
                                 <div>
                                    <p className="text-xs font-black text-gray-900 dark:text-white">عقوبة وإيقاف الحساب (Block)</p>
                                    <p className="text-[9px] text-gray-400 font-semibold">تأمين المنصة عبر قطع الدخول على الأرقام المخالفة والمشبوهة</p>
                                 </div>
                                 {targetUser.isBlocked ? (
                                    <button 
                                      onClick={handleUnblockUser}
                                      className="px-3 py-1.5 bg-green-600 text-white text-[9px] font-black rounded-xl"
                                    >
                                       فك الحظر الآن
                                    </button>
                                 ) : (
                                    <button 
                                      onClick={() => setShowBlockInput(!showBlockInput)}
                                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-[9px] font-black rounded-xl border border-red-200"
                                    >
                                       تعليق الحساب
                                    </button>
                                 )}
                              </div>

                              {showBlockInput && !targetUser.isBlocked && (
                                 <div className="mt-2 text-right space-y-2">
                                    <label className="text-[10px] font-black text-red-600">اكتب سبب الحظر الرسمي:</label>
                                    <input 
                                      type="text" 
                                      value={blockingReason}
                                      onChange={e => setBlockingReason(e.target.value)}
                                      placeholder="مثال: محاولة احتيال، تكرار الشكاوى بمسلمات البيع..."
                                      className="w-full bg-white dark:bg-gray-950 border border-red-105 rounded-xl px-3 py-2 text-xs font-bold text-right focus:ring-1 focus:ring-red-250 outline-none"
                                    />
                                    <button 
                                      onClick={handleBlockUser}
                                      disabled={submittingBlock}
                                      className="py-2 px-4 bg-red-605 text-white font-black text-[10px] rounded-lg bg-red-600 transition"
                                    >
                                       تطبيق الحظر الفوري الحاسم
                                    </button>
                                 </div>
                              )}
                           </div>

                        </div>
                     </div>

                  </div>
               )}

            </div>

         </div>

      </div>

      {/* Real-time Embedded Live Support chat overlay / Slide Panel */}
      <AnimatePresence>
         {showChatPanel && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-end" dir="rtl">
               <motion.div 
                 initial={{ x: '100%' }}
                 animate={{ x: 0 }}
                 exit={{ x: '100%' }}
                 className="bg-white dark:bg-gray-950 w-full sm:max-w-md h-full shadow-2xl flex flex-col overflow-hidden text-right border-l border-gray-100 dark:border-gray-900"
               >
                  {/* Chat Panel Header */}
                  <div className="p-5 border-b border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/60 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-xl">
                           <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="font-black text-xs text-gray-900 dark:text-white">المحادثة الإدارية المباشرة (حيّة)</h3>
                           <p className="text-[9px] text-gray-400 font-mono">طبيعة الاتصال: قنوات الدعم الداخلي</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowChatPanel(false)}
                       className="p-2 bg-white dark:bg-gray-800 text-gray-400 rounded-xl hover:text-gray-600 transition"
                     >
                        <X className="w-4 h-4" />
                     </button>
                  </div>

                  {/* Message body container */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50 dark:bg-[#060a10]">
                     {loadingChat ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-1 text-xs">
                           <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                           <span>جاري إنشاء خط الاتصال المشترك...</span>
                        </div>
                     ) : chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 text-center p-6 text-xs">
                           <MessageSquare className="w-10 h-10 opacity-20 text-blue-500" />
                           <p className="font-bold">لا يوجد أي رسائل سابقة في هذا الشات</p>
                           <p className="text-[10px] text-gray-400">ابدأ الآن بكتابة رسالة ترحيبية أو إعلامية بخصوص الطلب أو الرصيد</p>
                        </div>
                     ) : (
                        chatMessages.map((msg, index) => {
                           const isMe = msg.senderRole === 'admin';
                           return (
                              <div 
                                key={msg.id || index}
                                className={`flex ${isMe ? 'justify-start' : 'justify-end'} text-right`}
                              >
                                 <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-sm leading-relaxed ${
                                    isMe 
                                      ? 'bg-blue-605 bg-blue-600 text-white rounded-tr-none' 
                                      : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-tl-none'
                                 }`}>
                                    <p className="font-bold">{msg.text}</p>
                                    <div className={`text-[8px] font-semibold mt-1.5 flex items-center gap-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                       <Clock className="w-2.5 h-2.5" />
                                       <span>{msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'الآن'}</span>
                                    </div>
                                 </div>
                              </div>
                           )
                        })
                     )}
                     <div ref={messageEndRef} />
                  </div>

                  {/* Message Input form footer */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 dark:border-gray-900 bg-white dark:bg-gray-950 flex gap-2">
                     <input 
                       type="text"
                       placeholder="اكتب رسالتك المباشرة هنا لمساعدته..."
                       value={newMessage}
                       onChange={e => setNewMessage(e.target.value)}
                       className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-xs text-right outline-none focus:bg-white"
                     />
                     <button 
                       type="submit"
                       disabled={sendingMessage || !newMessage.trim()}
                       className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-40"
                     >
                        <Send className="w-4 h-4 scale-x-[-1]" />
                     </button>
                  </form>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

    </div>
  );
};
