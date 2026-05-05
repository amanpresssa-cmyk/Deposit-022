import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Search, PlusCircle, LayoutDashboard, User, ShieldCheck, Bell, X, CreditCard, AlertTriangle, Clock, CheckCircle2, MessageSquare, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const Navbar: React.FC = () => {
  const { user, profile, login, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      // Real-time Toast Logic
      if (items.length > 0) {
        const newest = items[0];
        if (lastNotification && newest.id !== lastNotification.id && !newest.isRead) {
          setLastNotification(newest);
          setShowToast(true);
          // Play a subtle sound if possible or just show toast
          setTimeout(() => setShowToast(false), 5000);
        } else if (!lastNotification) {
          setLastNotification(newest);
        }
      }

      setNotifications(items);
      setUnreadCount(items.filter((n: any) => !n.isRead).length);
    });

    return () => unsubscribe();
  }, [user, lastNotification]);

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'dispute': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'emergency': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img 
            src="https://i.imgur.com/OYaLVgI.png" 
            alt="عربون" 
            className="h-10 w-auto object-contain flex-shrink-0" 
          />
          <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">وساطة مالية</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-10">
          {user && profile?.isAdmin && (
            <Link to="/admin" className="px-5 py-2 bg-red-50 text-red-600 rounded-2xl font-black text-[11px] uppercase tracking-wider hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              لوحة الإدارة
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {showToast && lastNotification && (
              <motion.div
                initial={{ opacity: 0, y: -20, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="fixed top-24 left-4 z-50 bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 w-72 flex gap-3 cursor-pointer overflow-hidden"
                onClick={() => {
                  setShowToast(false);
                  setShowNotifications(true);
                }}
              >
                <div className="absolute top-0 right-0 w-1 h-full bg-blue-600"></div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  {getIcon(lastNotification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-900 truncate">{lastNotification.title}</p>
                  <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{lastNotification.message}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowToast(false); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) markAllAsRead();
                  }}
                  className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-all relative"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      className="absolute left-0 mt-4 w-80 bg-white rounded-3xl border border-gray-100 shadow-2xl p-4 overflow-hidden z-50 origin-top-left"
                    >
                      <div className="flex items-center justify-between mb-4 px-2">
                        <h4 className="font-black text-gray-900">الإشعارات</h4>
                        <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="py-12 text-center text-gray-300 font-bold">لا يوجد تنبيهات حالية</div>
                        ) : (
                          notifications.map((n) => (
                            <Link
                              key={n.id}
                              to={n.orderId ? `/order/${n.orderId}` : '#'}
                              onClick={() => setShowNotifications(false)}
                              className={`flex gap-3 p-3 rounded-2xl transition-all border border-transparent ${n.isRead ? 'hover:bg-gray-50' : 'bg-blue-50/50 hover:bg-blue-50 border-blue-100'}`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                                {getIcon(n.type)}
                              </div>
                              <div className="text-right overflow-hidden">
                                <p className="text-xs font-black text-gray-900 leading-tight truncate">{n.title}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                                <p className="text-[8px] text-gray-400 mt-1 font-bold">
                                  {format(n.createdAt?.toDate?.() || new Date(), 'HH:mm - dd MMM', { locale: ar })}
                                </p>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link 
                to="/dashboard" 
                className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                title="لوحة التحكم"
              >
                <LayoutDashboard className="w-6 h-6" />
              </Link>
              
              <Link 
                to="/settings" 
                className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                title="الإعدادات"
              >
                <Settings className="w-6 h-6" />
              </Link>
              
              <div className="h-10 w-[1px] bg-gray-100 mx-1"></div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-3 bg-gray-50 p-1.5 pr-4 rounded-2xl hover:bg-gray-100 transition-all border border-gray-100 group"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{profile?.displayName}</p>
                  <p className="text-[10px] font-bold text-gray-400">%{profile?.trustLevel || 10} ثقة</p>
                </div>
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.displayName || '')}&background=random`} 
                  alt="" 
                  className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
               <button 
                onClick={login}
                className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center gap-2"
              >
                <User className="w-5 h-5 pointer-events-none" />
                تسجيل الدخول
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
