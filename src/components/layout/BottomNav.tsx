import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, LayoutDashboard, PlusCircle, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 bg-white/90 backdrop-blur-xl border border-gray-100 z-50 px-6 h-18 flex items-center justify-between rounded-[2rem] shadow-2xl shadow-blue-100/50 pb-safe ring-1 ring-black/5">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1.5 transition-all ${isActive ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`
        }
      >
        <div className="relative">
          <Home className="w-6 h-6" />
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider">الرئيسية</span>
      </NavLink>

      <NavLink
        to="/search"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1.5 transition-all ${isActive ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`
        }
      >
        <Search className="w-6 h-6" />
        <span className="text-[9px] font-black uppercase tracking-wider">تصفح</span>
      </NavLink>

      {user && (
        <NavLink
          to="/orders/create"
          className={({ isActive }) =>
            `flex flex-col items-center -mt-12 bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-300 ring-4 ring-white transition-all transform active:scale-90 ${
              isActive ? 'bg-blue-700' : ''
            }`
          }
        >
          <PlusCircle className="w-7 h-7" />
        </NavLink>
      )}

      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1.5 transition-all ${isActive ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`
        }
      >
        <LayoutDashboard className="w-6 h-6" />
        <span className="text-[9px] font-black uppercase tracking-wider">طلباتي</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1.5 transition-all ${isActive ? 'text-blue-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`
        }
      >
        <User className="w-6 h-6" />
        <span className="text-[9px] font-black uppercase tracking-wider">حسابي</span>
      </NavLink>
    </div>
  );
};
