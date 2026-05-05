import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, LayoutDashboard, PlusCircle, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 px-6 h-14 flex items-center justify-between pb-safe">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`
        }
      >
        <Home className="w-6 h-6" />
        <span className="text-[10px] font-bold">الرئيسية</span>
      </NavLink>

      <NavLink
        to="/search"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`
        }
      >
        <Search className="w-6 h-6" />
        <span className="text-[10px] font-bold">تصفح</span>
      </NavLink>

      {user && (
        <NavLink
          to="/create-order"
          className={({ isActive }) =>
            `flex flex-col items-center -mt-8 bg-blue-600 text-white p-3 rounded-full shadow-lg border-4 border-gray-50 ${
              isActive ? 'scale-110' : ''
            } transition-transform`
          }
        >
          <PlusCircle className="w-7 h-7" />
        </NavLink>
      )}

      {user ? (
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`
          }
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold">طلباتي</span>
        </NavLink>
      ) : (
        <div className="flex flex-col items-center gap-1 text-gray-400">
           <User className="w-6 h-6 opacity-30" />
           <span className="text-[10px] font-bold">حسابي</span>
        </div>
      )}
    </div>
  );
};
