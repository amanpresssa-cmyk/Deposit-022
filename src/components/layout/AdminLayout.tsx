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
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';

export const AdminLayout: React.FC = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({
    finance: false,
    system: false
  });

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
        {!isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(true)}
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
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500"
            >
              {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="hidden sm:block">
              <h1 className="text-xs font-black text-gray-900">لوحة الإدارة</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button className="relative p-1.5 text-gray-400 hover:text-blue-600 transition-all">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
             </button>
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
