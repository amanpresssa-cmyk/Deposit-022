import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Search, PlusCircle, LayoutDashboard, LogOut, User, ShieldCheck, Bell } from 'lucide-react';
import { motion } from 'motion/react';

export const Navbar: React.FC = () => {
  const { user, profile, login, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img 
            src="https://i.imgur.com/OYaLVgI.png" 
            alt="عربون" 
            className="h-10 w-auto object-contain hover:scale-105 transition-transform duration-300" 
          />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-10">
          <Link to="/search" className="text-gray-500 hover:text-blue-600 font-bold text-sm transition-all flex items-center gap-1.5 hover:-translate-y-0.5 transform">
            <Search className="w-4 h-4" />
            تصفح الخدمات
          </Link>
          {user && (
            <>
              {profile?.isAdmin && (
                <Link to="/admin" className="px-5 py-2 bg-red-50 text-red-600 rounded-2xl font-black text-[11px] uppercase tracking-wider hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100 shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                  لوحة الإدارة
                </Link>
              )}
              <Link to="/create-order" className="text-blue-600 hover:text-blue-700 font-black text-sm flex items-center gap-1.5 hover:scale-105 transition-transform">
                <PlusCircle className="w-4 h-4" />
                ابدأ صفقة جديدة
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <button className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-all relative">
                <Bell className="w-6 h-6" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              
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
              
              <button 
                onClick={logout}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="تسجيل الخروج"
              >
                <LogOut className="w-6 h-6" />
              </button>
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
