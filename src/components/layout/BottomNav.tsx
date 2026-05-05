import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, LayoutDashboard, PlusCircle, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-2xl border border-gray-100 z-50 px-6 py-3 flex items-center justify-between rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <NavLink to="/" className="outline-none">
        {({ isActive }) => (
          <div className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>الرئيسية</span>
          </div>
        )}
      </NavLink>

      <NavLink to="/search" className="outline-none">
        {({ isActive }) => (
          <div className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
              <Search className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>تصفح</span>
          </div>
        )}
      </NavLink>

      {user && (
        <NavLink to="/orders/create" className="outline-none">
          {({ isActive }) => (
            <div className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <div className={`p-2 rounded-2xl transition-all bg-blue-600 text-white shadow-md shadow-blue-200 ${isActive ? 'scale-110 bg-blue-700' : 'hover:scale-105'}`}>
                <PlusCircle className="w-5 h-5" />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>طلب جديد</span>
            </div>
          )}
        </NavLink>
      )}

      <NavLink to="/dashboard" className="outline-none">
        {({ isActive }) => (
          <div className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>طلباتي</span>
          </div>
        )}
      </NavLink>

      <NavLink to="/profile" className="outline-none">
        {({ isActive }) => (
          <div className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
              <User className="w-5 h-5" />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>حسابي</span>
          </div>
        )}
      </NavLink>
    </div>
  );
};
