import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Search, PlusCircle, LayoutDashboard, User, ShieldCheck, Bell, X, CreditCard, AlertTriangle, Clock, CheckCircle2, MessageSquare, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

import { useNotifications } from '../providers/NotificationProvider';
import { markAllNotificationsAsRead, markNotificationAsRead } from '../../lib/notificationService';

export const Navbar: React.FC = () => {
  const { user, profile, login, logout } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'settlement' | 'normal'>('all');

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.uid);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    return n.priority === activeFilter;
  });

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent': return { color: 'bg-red-500', label: 'عاجل جداً', icon: <AlertTriangle className="w-3 h-3" /> };
      case 'settlement': return { color: 'bg-amber-500', label: 'تسوية مالية', icon: <CreditCard className="w-3 h-3" /> };
      default: return { color: 'bg-blue-500', label: 'عادي', icon: <Bell className="w-3 h-3" /> };
    }
  };

  const getIcon = (type: string, priority: string) => {
    if (priority === 'urgent') return <AlertTriangle className="w-4 h-4 text-red-600" />;
    switch (type) {
      case 'payment': return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'settlement': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'dispute': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      default: return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      await updateDoc(doc(db, 'notifications', n.id), { isRead: true });
    }
  };

  const updateEmailConsent = async (consent: boolean) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { emailConsent: consent });
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm pt-[env(safe-area-inset-top)]">
      {/* Email Consent Banner */}
      {user && profile && profile.emailConsent === undefined && (
        <div className="bg-blue-600 text-white px-4 py-2 text-[10px] md:text-sm font-bold flex items-center justify-center gap-4 animate-in slide-in-from-top duration-500">
          <span>هل ترغب في استلام تحديثات صفقاتك عبر البريد الإلكتروني؟</span>
          <div className="flex gap-2">
            <button onClick={() => updateEmailConsent(true)} className="bg-white text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black">نعم، أرغب</button>
            <button onClick={() => updateEmailConsent(false)} className="bg-blue-500 text-white px-3 py-1 rounded-lg text-[10px] font-black border border-blue-400">ليس الآن</button>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-1.5 md:gap-2 group shrink-0">
          <img 
            src="https://i.imgur.com/OYaLVgI.png" 
            alt="عربون" 
            className="h-7 md:h-10 w-auto object-contain flex-shrink-0" 
          />
          <span className="text-[9px] md:text-[10px] font-black text-blue-600 tracking-widest uppercase border-r border-gray-100 pr-2 hidden sm:block">وساطة مالية</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          {user && profile?.isAdmin && (
            <Link to="/admin" className="px-5 py-2 bg-red-50 text-red-600 rounded-2xl font-black text-[11px] uppercase tracking-wider hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              لوحة الإدارة
            </Link>
          )}
          <Link to="/search" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">تصفح الخدمات</Link>
          <Link to="/how-it-works" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">كيف يعمل؟</Link>
        </div>

              <div className="flex items-center gap-2 md:gap-4">
                {/* Sonner toasts will handle the real-time feedback */}
                {user ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) handleMarkAllAsRead();
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
                      className="absolute left-0 mt-4 w-[calc(100vw-2rem)] md:w-96 bg-white rounded-3xl border border-gray-100 shadow-2xl p-0 overflow-hidden z-50 origin-top-left"
                    >
                      <div className="p-6 pb-4 border-b border-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-black text-gray-900 text-lg">مركز التنبيهات</h4>
                          <button onClick={() => setShowNotifications(false)} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        
                        {/* Priority Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar pb-2">
                           {[
                             { id: 'all', label: 'الكل', bg: 'bg-blue-600', shadow: 'shadow-blue-100' },
                             { id: 'urgent', label: 'عاجلة', bg: 'bg-red-500', shadow: 'shadow-red-100' },
                             { id: 'settlement', label: 'تسوية', bg: 'bg-amber-500', shadow: 'shadow-amber-100' },
                             { id: 'normal', label: 'عادية', bg: 'bg-slate-500', shadow: 'shadow-slate-100' }
                           ].map(filter => (
                             <button
                               key={filter.id}
                               onClick={() => setActiveFilter(filter.id as any)}
                               className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-all whitespace-nowrap border ${
                                 activeFilter === filter.id 
                                 ? `${filter.bg} text-white border-transparent shadow-lg ${filter.shadow}` 
                                 : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                               }`}
                             >
                               {filter.label}
                             </button>
                           ))}
                        </div>
                      </div>

                      <div className="space-y-1 max-h-[450px] overflow-y-auto custom-scrollbar p-2">
                        {filteredNotifications.length === 0 ? (
                          <div className="py-20 text-center flex flex-col items-center gap-3">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                              <Bell className="w-8 h-8" />
                            </div>
                            <p className="text-gray-400 font-bold text-sm">لا يوجد تنبيهات في هذا القسم</p>
                          </div>
                        ) : (
                          filteredNotifications.map((n) => (
                            <Link
                              key={n.id}
                              to={n.orderId ? `/order/${n.orderId}` : '#'}
                              onClick={async () => {
                                setShowNotifications(false);
                                if (!n.isRead) await markNotificationAsRead(n.id);
                              }}
                              className={`group flex gap-4 p-4 rounded-2xl transition-all border border-transparent mb-1 ${n.isRead ? 'hover:bg-gray-50 opacity-75' : 'bg-blue-50/30 hover:bg-blue-50/60 border-blue-100/50'}`}
                            >
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 ${getPriorityConfig(n.priority).color} bg-opacity-10`}>
                                <div className={`${getPriorityConfig(n.priority).color.replace('bg-', 'text-')}`}>
                                  {getIcon(n.type, n.priority)}
                                </div>
                              </div>
                              <div className="text-right overflow-hidden flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${getPriorityConfig(n.priority).color} text-white`}>
                                    {getPriorityConfig(n.priority).label}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-bold">
                                    {format(n.createdAt?.toDate?.() || new Date(), 'HH:mm', { locale: ar })}
                                  </span>
                                </div>
                                <p className="text-xs font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors uppercase">{n.title}</p>
                                <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed font-bold">{n.message}</p>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                      
                      {filteredNotifications.length > 0 && (
                        <div className="p-4 bg-gray-50 text-center">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">تنبيه: يتم حذف الإشعارات تلقائياً بعد 30 يوماً</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="hidden md:flex items-center gap-3">
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
            </div>
          ) : (
            <div className="flex items-center gap-3">
               <button 
                onClick={login}
                className="bg-blue-600 text-white px-6 md:px-8 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center gap-2 text-sm md:text-base"
              >
                <User className="w-4 h-4 md:w-5 md:h-5 pointer-events-none" />
                دخول
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
