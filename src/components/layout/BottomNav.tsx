import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, LayoutDashboard, PlusCircle, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className={`md:hidden fixed bottom-3 left-4 right-4 bg-white/95 backdrop-blur-2xl border border-gray-100 z-50 px-6 py-1.5 flex items-center ${user ? 'justify-between' : 'justify-center gap-12'} rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-all animate-in slide-in-from-bottom-10 duration-500`}>
      <NavLink to="/" className="outline-none active:scale-90 transition-transform">
        {({ isActive }) => (
          <div className={`flex flex-col items-center transition-all ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50/50' : ''}`}>
              <Home className={`w-5 h-5 ${isActive ? 'fill-blue-600/10' : ''}`} />
            </div>
          </div>
        )}
      </NavLink>

      <NavLink to="/search" className="outline-none active:scale-90 transition-transform">
        {({ isActive }) => (
          <div className={`flex flex-col items-center transition-all ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50/50' : ''}`}>
              <Search className={`w-5 h-5 ${isActive ? 'fill-blue-600/10' : ''}`} />
            </div>
          </div>
        )}
      </NavLink>

      {user && (
        <>
          <NavLink to="/create-order" className="outline-none active:scale-90 transition-transform -mt-6">
            {({ isActive }) => (
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-950 text-white shadow-lg border-2 border-white transition-all ${isActive ? 'bg-blue-600' : ''}`}>
                  <PlusCircle className="w-5 h-5" />
                </div>
              </div>
            )}
          </NavLink>

          <NavLink to="/dashboard" className="outline-none active:scale-90 transition-transform">
            {({ isActive }) => (
              <div className={`flex flex-col items-center transition-all ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50/50' : ''}`}>
                  <LayoutDashboard className={`w-5 h-5 ${isActive ? 'fill-blue-600/10' : ''}`} />
                </div>
              </div>
            )}
          </NavLink>

          <NavLink to="/profile" className="outline-none active:scale-90 transition-transform">
            {({ isActive }) => (
              <div className={`flex flex-col items-center transition-all ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50/50' : ''}`}>
                  <User className={`w-5 h-5 ${isActive ? 'fill-blue-600/10' : ''}`} />
                </div>
              </div>
            )}
          </NavLink>
        </>
      )}
    </div>
  );
};
