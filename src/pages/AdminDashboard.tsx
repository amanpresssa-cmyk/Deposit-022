import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../types';
import { ShieldCheck, UserCheck, UserX, Clock, Search, AlertCircle, CheckCircle2, XCircle, TrendingUp, Wallet, PieChart, Activity, LayoutGrid, Image as ImageIcon, Upload, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { sendNotification } from '../lib/notificationService';

export const AdminDashboard: React.FC = () => {
  const { profile, logout } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<'users' | 'finance' | 'disputes' | 'system' | 'alerts' | 'support'>('users');
  const [homeCardSettings, setHomeCardSettings] = useState({
    imageUrl: '',
    quote: '',
    author: ''
  });
  const [footerSettings, setFooterSettings] = useState({
    description: ''
  });
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalVolume: 0,
    totalFees: 0,
    activeEscrows: 0,
    pendingVerifications: 0
  });

  useEffect(() => {
    if (profile?.email !== 'khyratfarmdates@gmail.com') return;

    // Fetch Alerts
    const alertsQ = query(collection(db, 'notifications'), where('userId', '==', 'ADMIN'), orderBy('createdAt', 'desc'));
    const unsubAlerts = onSnapshot(alertsQ, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications/ADMIN');
    });

    // Fetch Stats & Transactions
    const txQ = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(txQ, (snapshot) => {
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setTransactions(txs);
      
      const volume = txs.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
      const fees = txs.reduce((acc, tx) => acc + (Number(tx.fee) || 0), 0);
      const escrowed = txs.filter(tx => tx.status === 'escrowed').length;
      
      setStats(prev => ({ ...prev, totalVolume: volume, totalFees: fees, activeEscrows: escrowed }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    // Fetch Disputes
    const dispQ = query(collection(db, 'disputes'), orderBy('createdAt', 'desc'));
    const unsubDisp = onSnapshot(dispQ, (snapshot) => {
      setDisputes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'disputes');
    });

    // Fetch Support Tickets
    const supportQ = query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'));
    const unsubSupport = onSnapshot(supportQ, (snapshot) => {
      setSupportTickets(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_tickets');
    });

    return () => {
      unsubAlerts();
      unsubTx();
      unsubDisp();
      unsubSupport();
    };
  }, [profile]);

  useEffect(() => {
    if (tab === 'system') {
      const unsubHome = onSnapshot(doc(db, 'app_settings', 'home_card'), (doc) => {
        if (doc.exists()) {
          setHomeCardSettings(doc.data() as any);
        }
      });
      const unsubFooter = onSnapshot(doc(db, 'app_settings', 'footer'), (doc) => {
        if (doc.exists()) {
          setFooterSettings(doc.data() as any);
        }
      });
      return () => {
        unsubHome();
        unsubFooter();
      };
    }
  }, [tab]);

  useEffect(() => {
    if (profile?.email !== 'khyratfarmdates@gmail.com') return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(allUsers);
      setStats(prev => ({ ...prev, pendingVerifications: allUsers.filter(u => u.verificationStatus === 'pending').length }));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [profile]);

  const handleVerify = async (uid: string, approve: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
      if (approve) {
        await updateDoc(userRef, {
          verificationStatus: 'verified',
          isVerified: true,
          rating: 4,
          trustLevel: 80 // Jump to high trust upon manual verification
        });
        await sendNotification(uid, 'تهانينا! تم توثيق حسابك', 'تم مراجعة بياناتك بنجاح وأصبح حسابك الآن موثقاً في منصة عربون.', 'system', 'normal');
      } else {
        await updateDoc(userRef, {
          verificationStatus: 'rejected',
          isVerified: false
        });
        await sendNotification(uid, 'تنبيه: تحديث طلب التوثيق', 'نعتذر، تم رفض طلب التوثيق الخاص بك. يرجى مراجعة البيانات والمحاولة مرة أخرى.', 'system', 'normal');
      }
    } catch (error) {
      console.error("Error updating user verification:", error);
    }
  };

  const handleToggleBlock = async (uid: string, currentStatus: boolean | undefined) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isBlocked: !currentStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error toggling block status:", error);
    }
  };

  const handleToggleFeatured = async (uid: string, currentStatus: boolean | undefined) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isFeatured: !currentStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error toggling featured status:", error);
    }
  };

  const updateResponseTime = async (uid: string, time: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        avgResponseTime: time,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating response time:", error);
    }
  };

  const handleHomeCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 1 ميجابايت");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setHomeCardSettings(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveHomeCardSettings = async () => {
    try {
      const docRef = doc(db, 'app_settings', 'home_card');
      // Using setDoc would be better if it doesn't exist, but updateDoc might fail. 
      // I'll use a hack to ensure it exists or use setDoc from firestore
      const { setDoc } = await import('firebase/firestore');
      await setDoc(docRef, {
        ...homeCardSettings,
        updatedAt: serverTimestamp()
      });
      alert('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error("Error saving home card settings:", error);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const saveFooterSettings = async () => {
    try {
      const docRef = doc(db, 'app_settings', 'footer');
      const { setDoc } = await import('firebase/firestore');
      await setDoc(docRef, {
        ...footerSettings,
        updatedAt: serverTimestamp()
      });
      alert('تم حفظ إعدادات التذييل بنجاح');
    } catch (error) {
      console.error("Error saving footer settings:", error);
      alert('حدث خطأ أثناء فظ إعدادات التذييل');
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const ticketRef = doc(db, 'support_tickets', ticketId);
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating ticket status:", error);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesFilter = filter === 'all' || u.verificationStatus === filter;
    const matchesSearch = u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 rtl" dir="rtl">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 leading-none">مدير النظام</h2>
              <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Arboon Admin Console</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-gray-900 leading-none">{profile?.displayName}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-1">{profile?.email}</p>
            </div>
            <button 
              onClick={() => logout()}
              className="flex items-center gap-2 px-4 py-2 text-red-600 font-black text-xs hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
            >
              <Activity className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
           <h1 className="text-4xl font-black text-gray-900 mb-2">مركز إدارة عربون</h1>
           <p className="text-gray-500 font-medium">التحكم الكامل في المستخدمين، النزاعات، والتدفقات المالية.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto max-w-full">
           {[
             { id: 'users', label: 'المستخدمين', icon: <UserCheck className="w-4 h-4" /> },
             { id: 'finance', label: 'المالية', icon: <Wallet className="w-4 h-4" /> },
             { id: 'disputes', label: 'النزاعات', icon: <AlertCircle className="w-4 h-4" /> },
             { id: 'support', label: 'خدمة العملاء', icon: <MessageSquare className="w-4 h-4" /> },
             { id: 'alerts', label: 'البلاغات الطارئة', icon: <Activity className="w-4 h-4" /> },
             { id: 'system', label: 'الإعدادات', icon: <ShieldCheck className="w-4 h-4" /> },
           ].map(t => (
             <button
               key={t.id}
               onClick={() => setTab(t.id as any)}
               className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs transition-all whitespace-nowrap ${
                 tab === t.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-gray-400 hover:text-gray-600'
               }`}
             >
               {t.icon}
               {t.label}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'إجمالي التداولات', value: `${stats.totalVolume.toLocaleString()} ر.س`, icon: <TrendingUp />, color: 'blue' },
           { label: 'أرباح المنصة', value: `${stats.totalFees.toLocaleString()} ر.س`, icon: <Wallet />, color: 'green' },
           { label: 'طلبات توثيق قيد المراجعة', value: stats.pendingVerifications, icon: <ShieldCheck />, color: 'orange' },
           { label: 'عمليات تعميد نشطة', value: stats.activeEscrows, icon: <Clock />, color: 'indigo' },
         ].map((s, idx) => (
           <div key={idx} className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gray-50 text-gray-600`}>
                 {s.icon}
              </div>
              <p className="text-gray-400 font-bold text-[10px] uppercase mb-1">{s.label}</p>
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
           </div>
         ))}
      </div>

      {tab === 'finance' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-50 flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-black">آخر العمليات المالية</h2>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-right">
                   <thead>
                      <tr className="bg-gray-50/50 text-gray-400 text-xs font-black uppercase tracking-widest">
                         <th className="px-8 py-5">المستخدم</th>
                         <th className="px-8 py-5">المبلغ</th>
                         <th className="px-8 py-5">الرسوم</th>
                         <th className="px-8 py-5">الحالة</th>
                         <th className="px-8 py-5">التاريخ</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                           <td className="px-8 py-5 font-bold text-gray-600">{tx.userEmail || 'نظام'}</td>
                           <td className="px-8 py-5 font-black text-gray-900">{tx.amount} ر.س</td>
                           <td className="px-8 py-5 font-bold text-green-600">{(tx.fee || 0).toFixed(2)} ر.س</td>
                           <td className="px-8 py-5">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                tx.status === 'escrowed' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                              }`}>
                                 {tx.status === 'escrowed' ? 'في الضمان' : 'مكتمل'}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-sm text-gray-400 font-medium">
                              {format(tx.createdAt?.toDate?.() || new Date(), 'dd MMM HH:mm', { locale: ar })}
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {tab === 'disputes' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-12 text-center">
            <AlertCircle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
            <h3 className="text-xl font-black mb-2">إدارة النزاعات</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">سيتم عرض كافة الصفقات المتنازع عليها هنا ليتم التدخل اليدوي وحلها من قبل الإدارة.</p>
            {disputes.length === 0 ? (
                <div className="py-8 text-gray-300 font-bold">لا توجد نزاعات حالية تتطلب تدخل</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {/* Disputes list would go here */}
                </div>
            )}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-red-600" />
              <h2 className="text-2xl font-black">بلاغات التقييم والأنظمة</h2>
           </div>
           {notifications.length === 0 ? (
             <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-20 text-center text-gray-300 font-bold">
                لا توجد بلاغات طارئة حالياً
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-4">
                {notifications.map(alert => (
                  <div key={alert.id} className="bg-white p-6 rounded-3xl border-r-4 border-red-500 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                           <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                           <h4 className="font-black text-gray-900">{alert.title}</h4>
                           <p className="text-gray-500 text-sm font-medium">{alert.message}</p>
                           <p className="text-[10px] text-gray-400 font-bold mt-2">
                              {format(alert.createdAt?.toDate?.() || new Date(), 'dd MMM HH:mm', { locale: ar })}
                           </p>
                        </div>
                     </div>
                     {alert.targetUserId && (
                        <Link 
                           to={`/seller/${alert.targetUserId}`}
                           className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                        >
                           عرض ملف المستخدم
                        </Link>
                     )}
                  </div>
                ))}
             </div>
           )}
        </div>
      )}

      {tab === 'support' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-black">طلبات الدعم والشكاوى</h2>
           </div>

           <div className="grid grid-cols-1 gap-4">
              {supportTickets.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-20 text-center text-gray-300 font-bold border border-gray-100">
                   لا توجد تذاكر دعم حالياً
                </div>
              ) : (
                supportTickets.map(ticket => (
                  <div key={ticket.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                     <div className="flex items-start gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                           ticket.type === 'complaint' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                           {ticket.type === 'complaint' ? <AlertCircle className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
                        </div>
                        <div className="space-y-1">
                           <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                                 ticket.type === 'complaint' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                 {ticket.type === 'complaint' ? 'بلاغ' : 'محادثة مباشرة'}
                              </span>
                              <h4 className="font-black text-lg text-gray-900">{ticket.userName}</h4>
                           </div>
                           <p className="text-sm font-bold text-gray-400">{ticket.userEmail}</p>
                           {ticket.category && (
                              <p className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg inline-block">
                                 التصنيف: {ticket.category}
                              </p>
                           )}
                           <div className="mt-4 p-4 bg-gray-50 rounded-2xl text-sm font-medium text-gray-600 leading-relaxed border border-gray-100">
                              {ticket.message || 'طلب محادثة مباشرة'}
                           </div>
                           <p className="text-[10px] text-gray-300 font-bold">
                              تم التقديم: {format(ticket.createdAt?.toDate?.() || new Date(), 'dd MMM yyyy HH:mm', { locale: ar })}
                           </p>
                        </div>
                     </div>
                     
                     <div className="flex flex-col gap-3 min-w-[160px]">
                        <div className="text-center p-3 rounded-2xl bg-gray-50 border border-gray-100">
                           <p className="text-[10px] font-black text-gray-400 uppercase mb-1">الحالة الحالية</p>
                           <span className={`text-xs font-black ${
                              ticket.status === 'open' || ticket.status === 'requested' ? 'text-orange-600' : 'text-green-600'
                           }`}>
                              {ticket.status === 'open' ? 'قيد المراجعة' : 
                               ticket.status === 'requested' ? 'بانتظار الرد' : 
                               ticket.status === 'resolved' ? 'تم الحل' : 'مغلق'}
                           </span>
                        </div>
                        
                        {(ticket.status === 'open' || ticket.status === 'requested') && (
                           <button 
                              onClick={() => handleUpdateTicketStatus(ticket.id, 'resolved')}
                              className="w-full py-3 bg-green-600 text-white rounded-xl font-black text-xs hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                           >
                              تحديد كتم الحل
                           </button>
                        )}
                        <button 
                           onClick={() => handleUpdateTicketStatus(ticket.id, 'closed')}
                           className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-xs hover:bg-gray-200 transition-all"
                        >
                           إغلاق التذكرة
                        </button>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {tab === 'system' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-8">
                 <LayoutGrid className="w-6 h-6 text-blue-600" />
                 <h2 className="text-xl font-black text-gray-900">تخصيص الصفحة الرئيسية</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-sm font-black text-gray-700 block px-1">صورة البطاقة التعريفية (Home Card)</label>
                       <div className="flex flex-col gap-4">
                          <div className="relative h-48 bg-gray-50 rounded-3xl overflow-hidden border-2 border-dashed border-gray-200">
                             {homeCardSettings.imageUrl ? (
                                <img src={homeCardSettings.imageUrl} className="w-full h-full object-cover" />
                             ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                   <ImageIcon className="w-12 h-12" />
                                   <span className="text-sm font-bold">لا توجد صورة محملة</span>
                                </div>
                             )}
                          </div>
                          <label className="cursor-pointer">
                             <div className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all font-black text-sm">
                                <Upload className="w-5 h-5" />
                                <span>رفع صورة جديدة</span>
                             </div>
                             <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleHomeCardUpload(e)} 
                             />
                          </label>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-sm font-black text-gray-700 block px-1">نص الاقتباس / الوصف</label>
                       <textarea 
                          value={homeCardSettings.quote}
                          onChange={(e) => setHomeCardSettings({...homeCardSettings, quote: e.target.value})}
                          rows={4}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                          placeholder="اكتب الاقتباس هنا..."
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-black text-gray-700 block px-1">اسم الكاتب / المصدر</label>
                       <input 
                          type="text"
                          value={homeCardSettings.author}
                          onChange={(e) => setHomeCardSettings({...homeCardSettings, author: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium"
                          placeholder="مثال: عبدالله، عميل مستمر"
                       />
                    </div>
                    <button 
                       onClick={saveHomeCardSettings}
                       className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
                    >
                       حفظ التغييرات
                    </button>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-12 text-center text-gray-400 font-bold">
               <div className="flex items-center gap-3 mb-8">
                  <Activity className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-black text-gray-900">تخصيص تذييل الموقع (Footer)</h2>
               </div>
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-sm font-black text-gray-700 block px-1">وصف المنصة في التذييل</label>
                     <textarea 
                        value={footerSettings.description}
                        onChange={(e) => setFooterSettings({description: e.target.value})}
                        rows={3}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-medium text-right"
                        placeholder="المنصة الأولى الموثوقة للوساطة المالية..."
                     />
                  </div>
                  <button 
                     onClick={saveFooterSettings}
                     className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                  >
                     حفظ وصف التذييل
                  </button>
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-12 text-center text-gray-400 font-bold">
               قريباً: إعدادات النظام المتقدمة، تعديل العمولات، والرسائل الجماعية.
           </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
             {[
               { id: 'all', label: 'الكل' },
               { id: 'pending', label: 'قيد المراجعة' },
               { id: 'verified', label: 'موثق' },
               { id: 'rejected', label: 'مرفوض' }
             ].map(f => (
               <button
                 key={f.id}
                 onClick={() => setFilter(f.id as any)}
                 className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                   filter === f.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
                 }`}
               >
                 {f.label}
               </button>
             ))}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-blue-100/10 overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row justify-between items-center gap-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-blue-500" />
                  طلبات التوثيق والمستخدمين ({filteredUsers.length})
                </h2>
                <div className="relative w-full md:w-80">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                      type="text"
                      placeholder="بحث بالاسم أو البريد..."
                      className="w-full pr-12 pl-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                      <tr className="bg-gray-50/50 text-gray-400 text-sm font-bold uppercase tracking-wider">
                        <th className="px-8 py-5">المستخدم</th>
                        <th className="px-8 py-5">التميز والسرعة</th>
                        <th className="px-8 py-5">رقم الهوية</th>
                        <th className="px-8 py-5">الحالة</th>
                        <th className="px-8 py-5">مستوى الثقة</th>
                        <th className="px-8 py-5">التاريخ</th>
                        <th className="px-8 py-5">الجراءات</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {filteredUsers.map(user => (
                        <motion.tr 
                            layout 
                            key={user.uid}
                            className="hover:bg-blue-50/10 transition-colors"
                        >
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                  <img 
                                    src={user.photoURL} 
                                    className="w-12 h-12 rounded-2xl object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <p className="font-bold text-gray-900">{user.displayName}</p>
                                    <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                                  </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col gap-2">
                                <button 
                                  onClick={() => handleToggleFeatured(user.uid, user.isFeatured)}
                                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all ${
                                    user.isFeatured ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' : 'bg-gray-50 text-gray-400 border border-gray-100'
                                  }`}
                                >
                                  <Star className={`w-3.5 h-3.5 ${user.isFeatured ? 'fill-yellow-600' : ''}`} />
                                  {user.isFeatured ? 'متميز' : 'تمييز'}
                                </button>
                                <input 
                                  type="text"
                                  placeholder="سرعة الرد (مثال: 5 د)"
                                  className="text-[10px] px-2 py-1 bg-gray-50 border border-gray-100 rounded focus:border-blue-300 outline-none w-24 font-bold"
                                  defaultValue={user.avgResponseTime || ''}
                                  onBlur={(e) => updateResponseTime(user.uid, e.target.value)}
                                />
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className="font-mono font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg">
                                  {user.idNumber || 'غير متوفر'}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              {user.verificationStatus === 'pending' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-black">
                                    <Clock className="w-3.5 h-3.5" />
                                    قيد المراجعة
                                  </span>
                              )}
                              {user.verificationStatus === 'verified' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-black">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    موثق
                                  </span>
                              )}
                              {user.verificationStatus === 'rejected' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-black">
                                    <XCircle className="w-3.5 h-3.5" />
                                    مرفوض
                                  </span>
                              )}
                              {(!user.verificationStatus || user.verificationStatus === 'none') && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-400 rounded-full text-xs font-black">
                                    لم يقدم طلب
                                  </span>
                              )}
                            </td>
                            <td className="px-8 py-6">
                              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden max-w-[80px]">
                                  <div 
                                    className="bg-blue-600 h-full" 
                                    style={{ width: `${user.trustLevel || 0}%` }} 
                                  />
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 mt-1 block">%{user.trustLevel || 0}</span>
                            </td>
                            <td className="px-8 py-6 text-sm text-gray-500 font-medium whitespace-nowrap">
                              {format(user.createdAt?.toDate?.() || new Date(), 'dd MMM yyyy', { locale: ar })}
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex gap-2">
                                  {user.verificationStatus === 'pending' && (
                                    <>
                                        <button 
                                          onClick={() => handleVerify(user.uid, true)}
                                          className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all border border-green-200"
                                          title="قبول التوثيق"
                                        >
                                          <UserCheck className="w-5 h-5" />
                                        </button>
                                        <button 
                                          onClick={() => handleVerify(user.uid, false)}
                                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-200"
                                          title="رفض التوثيق"
                                        >
                                          <UserX className="w-5 h-5" />
                                        </button>
                                    </>
                                  )}
                                  {user.verificationStatus === 'verified' && (
                                    <button 
                                        onClick={() => handleVerify(user.uid, false)}
                                        className="px-4 py-2 bg-gray-50 text-red-400 rounded-xl text-xs font-bold hover:bg-red-50 transition-all"
                                    >
                                        إلغاء التوثيق
                                    </button>
                                  )}
                                  <button 
                                      onClick={() => handleToggleBlock(user.uid, user.isBlocked)}
                                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        user.isBlocked ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                      }`}
                                  >
                                      {user.isBlocked ? 'إلغاء الحظر' : 'حظر المستخدم'}
                                  </button>
                              </div>
                            </td>
                        </motion.tr>
                      ))}
                  </tbody>
                </table>
            </div>
            {filteredUsers.length === 0 && (
                <div className="text-center py-20 text-gray-400 font-bold">
                  لا توجد بيانات مطابقة للبحث أو الفلترة.
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
  );
};
