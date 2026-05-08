import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, LayoutDashboard, PlusCircle, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className={`md:hidden fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-2xl border border-gray-100 z-50 px-4 py-3 flex items-center ${user ? 'justify-between' : 'justify-center gap-12'} rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all animate-in slide-in-from-bottom-10 duration-500`}>
      <NavLink to="/" className="outline-none active:scale-90 transition-transform">
        {({ isActive }) => (
          <div className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`p-2.5 rounded-2xl transition-all ${isActive ? 'bg-blue-50/50' : ''}`}>
              <Home className={`w-5 h-5 ${isActive ? 'fill-blue-600/10' : ''}`} />
            </div>
            <span className={`text-[8px] font-black uppercase tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>الرئيسية</span>
          </div>
        )}
      </NavLink>

      <NavLink to="/search" className="outline-none active:scale-90 transition-transform">
        {({ isActive }) => (
          <div className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`p-2.5 rounded-2xl transition-all ${isActive ? 'bg-blue-50/50' : ''}`}>
              <Search className={`w-5 h-5 ${isActive ? 'fill-blue-600/10' : ''}`} />
            </div>
            <span className={`text-[8px] font-black uppercase tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>تصفح</span>
          </div>
        )}
      </NavLink>

      {user && (
        <>
          <NavLink to="/create-order" className="outline-none active:scale-90 transition-transform -mt-10">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-1">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-gray-950 text-white shadow-2xl shadow-gray-200 border-4 border-white transition-all ${isActive ? 'bg-blue-600 scale-110' : 'hover:scale-105'}`}>
                  <PlusCircle className="w-7 h-7" />
                </div>
                <span className="text-[8px] font-black text-gray-900 uppercase tracking-widest mt-1">طلب جديد</span>
              </div>
            )}
          </NavLink>

          <NavLink to="/dashboard" className="outline-none active:scale-90 transition-transform">
            {({ isActive }) => (
              <div className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`p-2.5 rounded-2xl transition-all ${isActive ? 'bg-blue-50/50' : ''}`}>
                  <LayoutDashboard className={`w-5 h-5 ${isActive ? 'fill-blue-600/10' : ''}`} />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>طلباتي</span>
              </div>
            )}
          </NavLink>

          <NavLink to="/profile" className="outline-none active:scale-90 transition-transform">
            {({ isActive }) => (
              <div className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`p-2.5 rounded-2xl transition-all ${isActive ? 'bg-blue-50/50' : ''}`}>
                  <User className={`w-5 h-5 ${isActive ? 'fill-blue-600/10' : ''}`} />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>حسابي</span>
              </div>
            )}
          </NavLink>
        </>
      )}
    </div>
  );
};
