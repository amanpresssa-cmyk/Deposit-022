import React from 'react';
import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom';
import { 
  ShieldCheck, 
  Users, 
  Wallet, 
  AlertCircle, 
  MessageSquare, 
  Settings, 
  LayoutDashboard, 
  LogOut,
  Bell,
  Menu,
  Terminal,
  Zap,
  ChevronDown,
  ChevronRight,
  X,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../providers/NotificationProvider';
import { markNotificationAsRead } from '../../lib/notificationService';
import { motion, AnimatePresence } from 'motion/react';

export const AdminLayout: React.FC = () => {
  const { profile, logout } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(window.innerWidth > 1024);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({
    finance: false,
    system: false
  });

  // Handle window resize to auto-close/open sidebar
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMenu = (id: string) => {
    setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sections = [
    { 
      type: 'single',
      id: 'overview', 
      label: 'نظرة عامة', 
      icon: <LayoutDashboard className="w-5 h-5" />, 
      path: '/admin' 
    },
    { 
      type: 'single',
      id: 'analytics', 
      label: 'التحليلات الذكية', 
      icon: <BarChart3 className="w-5 h-5" />, 
      path: '/admin/analytics' 
    },
    { 
      type: 'single',
      id: 'users', 
      label: 'المستخدمين والتوثيق', 
      icon: <Users className="w-5 h-5" />, 
      path: '/admin/users' 
    },
    {
      type: 'group',
      id: 'finance',
      label: 'الإدارة المالية',
      icon: <Wallet className="w-5 h-5" />,
      items: [
        { id: 'transactions', label: 'سجل التداولات', path: '/admin/transactions' },
        { id: 'revenue', label: 'إحصائيات الأرباح', path: '/admin/revenue' },
        { id: 'settlements', label: 'التسويات البنكية', path: '/admin/settlements' },
      ]
    },
    { 
      type: 'single',
      id: 'disputes', 
      label: 'إدارة النزاعات', 
      icon: <AlertCircle className="w-5 h-5" />, 
      path: '/admin/disputes' 
    },
    { 
      type: 'single',
      id: 'support', 
      label: 'تذاكر الدعم', 
      icon: <MessageSquare className="w-5 h-5" />, 
      path: '/admin/support' 
    },
    {
      type: 'group',
      id: 'system',
      label: 'النظام والإعدادات',
      icon: <Settings className="w-5 h-5" />,
      items: [
        { id: 'logs', label: 'سجل النظام', path: '/admin/logs' },
        { id: 'settings', label: 'إعدادات المنصة', path: '/admin/settings' },
        { id: 'logout', label: 'خروج من النظام', path: '#', onClick: () => logout(), isAction: true },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex rtl" dir="rtl">
      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 h-screen z-50
        bg-white border-l border-gray-100 shadow-2xl lg:shadow-none
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 lg:w-16 translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full bg-white overflow-hidden">
          {/* Logo Section */}
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-100 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              {isSidebarOpen && (
                <div className="overflow-hidden">
                  <h2 className="text-sm font-black text-gray-900 leading-none truncate">عربون أدمن</h2>
                  <p className="text-[8px] text-gray-400 font-bold mt-0.5 uppercase tracking-widest whitespace-nowrap">Console v2.0</p>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto no-scrollbar">
            {sections.map((section) => (
              <div key={section.id} className="space-y-1">
                {section.type === 'single' ? (
                  <NavLink
                    to={section.path!}
                    end={section.path === '/admin'}
                    className={({ isActive }) => `
                      flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all group
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                        : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}
                    `}
                  >
                    <div className="shrink-0">{React.cloneElement(section.icon as React.ReactElement, { className: 'w-4 h-4' })}</div>
                    {isSidebarOpen && <span className="whitespace-nowrap">{section.label}</span>}
                  </NavLink>
                ) : (
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleMenu(section.id)}
                      className={`
                        w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all group
                        ${openMenus[section.id] 
                          ? 'bg-gray-50 text-blue-600' 
                          : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="shrink-0">{React.cloneElement(section.icon as React.ReactElement, { className: 'w-4 h-4' })}</div>
                        {isSidebarOpen && <span className="whitespace-nowrap">{section.label}</span>}
                      </div>
                      {isSidebarOpen && (
                        openMenus[section.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {openMenus[section.id] && isSidebarOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-gray-50/50 rounded-xl mr-4"
                        >
                          {section.items?.map((item) => (
                            item.isAction ? (
                              <button
                                key={item.id}
                                onClick={item.onClick}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-all text-right"
                              >
                                <LogOut className="w-3 h-3" />
                                <span>{item.label}</span>
                              </button>
                            ) : (
                              <NavLink
                                key={item.id}
                                to={item.path!}
                                className={({ isActive }) => `
                                  flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold transition-all
                                  ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
                                `}
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
                                <span>{item.label}</span>
                              </NavLink>
                            )
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Bottom Profile Area */}
          <div className="p-3 border-t border-gray-50">
            {isSidebarOpen && (
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-xs font-black">
                  {profile?.displayName?.[0] || 'A'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black text-gray-900 truncate">{profile?.displayName}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 md:p-1.5 hover:bg-gray-100 rounded-xl md:rounded-lg transition-all text-gray-500 active:scale-95"
            >
              {isSidebarOpen ? <X className="w-5 h-5 md:w-4 md:h-4" /> : <Menu className="w-5 h-5 md:w-4 md:h-4" />}
            </button>
            <div className="hidden sm:block">
              <h1 className="text-xs font-black text-gray-900">لوحة الإدارة</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white">
             <div className="relative">
               <button 
                 onClick={() => setShowNotifications(!showNotifications)}
                 className="relative p-1.5 text-gray-400 hover:text-blue-600 transition-all focus:outline-none"
               >
                  <Bell className="w-5 h-5 pointer-events-none" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-bounce pointer-events-none" />
                  )}
               </button>

               <AnimatePresence>
                 {showNotifications && (
                   <motion.div
                     initial={{ opacity: 0, y: 12, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 12, scale: 0.95 }}
                     className="absolute left-0 mt-3 w-80 bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-50 text-right"
                   >
                     <div className="px-5 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                       <span className="text-xs font-black text-gray-900">إشعارات الإدارة ({unreadCount})</span>
                       <button onClick={() => setShowNotifications(false)} className="text-[10px] text-gray-400 hover:text-gray-600 font-bold">إغلاق</button>
                     </div>
                     <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                       {notifications.length === 0 ? (
                         <div className="p-8 text-center text-xs text-gray-400 font-bold">لا توجد إشعارات جديدة</div>
                       ) : (
                         notifications.slice(0, 10).map((n) => (
                           <div 
                             key={n.id} 
                             onClick={async () => {
                               setShowNotifications(false);
                               if (!n.isRead && n.id) await markNotificationAsRead(n.id);
                               if (n.action?.url) navigate(n.action.url);
                               else if (n.orderId || n.type === 'payment' || n.type === 'settlement') navigate(`/admin/transactions`);
                               else if (n.type === 'dispute') navigate(`/admin/disputes`);
                               else if (n.type === 'message' || n.ticketId) navigate(`/admin/support`);
                               else navigate(`/admin`);
                             }}
                             className={`p-4 text-right hover:bg-gray-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-blue-50/20' : ''}`}
                           >
                             <div className="flex justify-between items-start gap-2">
                               <p className="text-[11px] font-black text-gray-900 leading-tight block">{n.title}</p>
                               {!n.isRead && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping shrink-0" />}
                             </div>
                             <p className="text-[10px] text-gray-500 mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                             <span className="text-[8px] text-gray-400 block mt-1.5">
                               {n.createdAt?.toDate ? new Date(n.createdAt.toDate()).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) : 'الآن'}
                             </span>
                           </div>
                         ))
                       )}
                     </div>
                     <div className="p-3 border-t border-gray-50 text-center bg-gray-50/30">
                       <Link 
                         to="/admin/support" 
                         onClick={() => setShowNotifications(false)}
                         className="text-[10px] font-black text-blue-600 hover:underline block"
                       >
                         عرض جميع تذاكر الدعم والنزاعات ←
                       </Link>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
             <Link 
               to="/?view=site"
               className="text-[10px] font-black text-gray-500 hover:text-blue-600 transition-all border-r border-gray-100 pr-3 flex items-center gap-1.5"
             >
               عرض الموقع
               <LayoutDashboard className="w-3.5 h-3.5" />
             </Link>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-6 md:p-8 lg:p-10 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
