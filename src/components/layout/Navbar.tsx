import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Search, PlusCircle, LayoutDashboard, User, ShieldCheck, Bell, X, CreditCard, AlertTriangle, Clock, CheckCircle2, MessageSquare, Settings, Sparkles, ChevronRight, Menu, LogOut, HelpCircle, FileText, Info } from 'lucide-react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'settlement' | 'normal'>('all');

  const [announcement, setAnnouncement] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'announcement'), (snapshot) => {
      if (snapshot.exists()) {
        setAnnouncement(snapshot.data());
      }
    });
    return () => unsub();
  }, []);

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

  const location = useLocation();
  const isViewingAsUser = new URLSearchParams(location.search).get('view') === 'site';
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;
  const showAdminUI = isAdmin && !isViewingAsUser;

  return (
    <div className="sticky top-0 z-50 w-full">
      {/* Announcement Bar */}
      {announcement && announcement.isActive && (
        <div className={`px-4 py-2 text-center text-xs md:text-sm font-black relative overflow-hidden transition-all ${
          announcement.type === 'urgent' ? 'bg-red-600 text-white' : 
          announcement.type === 'promo' ? 'bg-purple-600 text-white' : 
          'bg-blue-900 text-white'
        }`}>
          {announcement.link ? (
            <a href={announcement.link} className="flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <span>{announcement.text}</span>
              <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
            </a>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>{announcement.text}</span>
              <Bell className="w-4 h-4 shrink-0" />
            </div>
          )}
        </div>
      )}

      <nav className="w-full bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm pt-[env(safe-area-inset-top)]">
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
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="md:hidden p-2 text-gray-500 hover:bg-gray-50 rounded-xl transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <Link to="/" className="flex items-center gap-1.5 md:gap-2 group shrink-0">
            <img 
              src="https://i.imgur.com/OYaLVgI.png" 
              alt="عربون" 
              className="h-7 md:h-10 w-auto object-contain flex-shrink-0" 
            />
            <span className="text-[9px] md:text-[10px] font-black text-blue-600 tracking-widest uppercase border-r border-gray-100 pr-2 hidden sm:block">وساطة مالية</span>
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          {user && isAdmin && (
            <Link to="/admin" className="px-5 py-2 bg-red-50 text-red-600 rounded-2xl font-black text-[11px] uppercase tracking-wider hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              لوحة الإدارة
            </Link>
          )}
          {!showAdminUI && (
            <>
              <Link to="/search" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">تصفح الخدمات</Link>
              <Link to="/how-it-works" className="text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">كيف يعمل؟</Link>
            </>
          )}
        </div>

              <div className="flex items-center gap-2 md:gap-4">
                {/* Sonner toasts will handle the real-time feedback */}
                {user ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-all relative z-10"
                >
                  <Bell className="w-6 h-6 pointer-events-none" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce pointer-events-none">
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
                          <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                              <button 
                                onClick={handleMarkAllAsRead}
                                className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all border border-blue-100"
                              >
                                قراءة الكل
                              </button>
                            )}
                            <button onClick={() => setShowNotifications(false)} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 hover:text-gray-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
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
                            <div
                              key={n.id}
                              className={`group p-4 rounded-2xl transition-all border border-transparent mb-1 relative flex gap-4 ${n.isRead ? 'hover:bg-gray-50 opacity-75' : 'bg-blue-50/40 hover:bg-blue-50/60 border-blue-100/60 shadow-sm'}`}
                            >
                              {!n.isRead && (
                                <div className="absolute top-4 left-4 w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.5)] animate-pulse" />
                              )}
                              
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getPriorityConfig(n.priority).color} bg-opacity-10 ring-1 ring-inset ${getPriorityConfig(n.priority).color.replace('bg-', 'ring-')}/20`}>
                                <div className={`${getPriorityConfig(n.priority).color.replace('bg-', 'text-')}`}>
                                  {getIcon(n.type, n.priority)}
                                </div>
                              </div>

                              <div className="flex-1 overflow-hidden">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${getPriorityConfig(n.priority).color} text-white uppercase`}>
                                    {getPriorityConfig(n.priority).label}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-bold">
                                    {format(n.createdAt?.toDate?.() || new Date(), 'HH:mm', { locale: ar })}
                                  </span>
                                </div>
                                <h5 className="text-[11px] font-black text-gray-900 leading-tight mb-1 group-hover:text-blue-600 transition-colors uppercase">
                                  {n.title}
                                </h5>
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed line-clamp-2">
                                  {n.message}
                                </p>
                                
                                <div className="mt-3 flex items-center gap-2">
                                  {n.action ? (
                                    <button 
                                      onClick={async () => {
                                        if (!n.isRead) await markNotificationAsRead(n.id);
                                        setShowNotifications(false);
                                        navigate(n.action.url);
                                      }}
                                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black shadow-sm shadow-blue-100 hover:shadow-md transition-all flex items-center gap-2"
                                    >
                                      {n.action.label}
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  ) : n.orderId && (
                                    <Link 
                                      to={`/order/${n.orderId}`}
                                      onClick={async () => {
                                        if (!n.isRead) await markNotificationAsRead(n.id);
                                        setShowNotifications(false);
                                      }}
                                      className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-black hover:bg-blue-600 transition-all flex items-center gap-2"
                                    >
                                      تفاصيل الطلب
                                      <LayoutDashboard className="w-3 h-3" />
                                    </Link>
                                  )}
                                  
                                  {!n.isRead && (
                                    <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        markNotificationAsRead(n.id);
                                      }}
                                      className="text-[9px] font-black text-gray-400 hover:text-blue-600 px-2 py-1"
                                    >
                                      تحديد كمقروء
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
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
                {!showAdminUI && (
                  <>
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
                  </>
                )}

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}
                  className="flex items-center gap-3 bg-gray-50 p-1.5 pr-4 rounded-2xl hover:bg-gray-100 transition-all border border-gray-100 group"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{profile?.displayName || (isAdmin ? 'المدير العام' : 'مستخدم جديد')}</p>
                    {!isAdmin && <p className="text-[10px] font-bold text-gray-400">%{profile?.trustLevel || 10} ثقة</p>}
                    {isAdmin && <p className="text-[10px] font-bold text-red-500">حساب إداري</p>}
                  </div>
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.displayName || 'Admin')}&background=random`} 
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

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm bg-white z-[101] md:hidden flex flex-col shadow-2xl"
              dir="rtl"
            >
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2">
                  <img src="https://i.imgur.com/OYaLVgI.png" alt="عربون" className="h-8 w-auto" />
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">وساطة آمنة</span>
                </Link>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Auth Section */}
                {user ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <img 
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.displayName || 'User')}&background=random`} 
                        alt="" 
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-black text-gray-900 truncate">{profile?.displayName || 'مستخدم'}</p>
                        <p className="text-[10px] font-bold text-gray-400">%{profile?.trustLevel || 10} ثقة</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-gray-500">مرحباً بك في عربون</p>
                    <button 
                      onClick={() => { login(); setIsMenuOpen(false); }}
                      className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-blue-100"
                    >
                      <User className="w-5 h-5" />
                      تسجيل الدخول
                    </button>
                  </div>
                )}

                {/* Primary Nav */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">التنقل السريع</p>
                  <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-700 bg-gray-50/50">
                    <LayoutDashboard className="w-5 h-5 text-blue-600" />
                    <span>الرئيسية</span>
                  </Link>
                  <Link to="/search" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-700">
                    <Search className="w-5 h-5 text-blue-600" />
                    <span>تصفح الصفقات</span>
                  </Link>
                  {user && (
                    <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      <span>طلباتي النشطة</span>
                    </Link>
                  )}
                </div>

                {/* Info Nav */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">الدعم والمعلومات</p>
                  <Link to="/how-it-works" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-600">
                    <Info className="w-5 h-5" />
                    <span>كيف يعمل؟</span>
                  </Link>
                  <Link to="/help-center" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-600">
                    <HelpCircle className="w-5 h-5" />
                    <span>مركز المساعدة</span>
                  </Link>
                  <Link to="/faq" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-600">
                    <MessageSquare className="w-5 h-5" />
                    <span>الأسئلة الشائعة</span>
                  </Link>
                  <Link to="/terms" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-600">
                    <FileText className="w-5 h-5" />
                    <span>الشروط والأحكام</span>
                  </Link>
                </div>
              </div>

              {user && (
                <div className="p-6 border-t border-gray-50">
                  <button 
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-red-500 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    خروج من النظام
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
