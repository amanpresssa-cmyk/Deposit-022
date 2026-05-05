import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Shield, Search, PlusCircle, LayoutDashboard, LogOut, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, profile, login, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <img src="https://i.imgur.com/2SnJnxE.png" alt="Arboon Logo" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold text-gray-900 font-sans tracking-tight">عربون</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link to="/search" className="text-gray-600 hover:text-[#2563eb] font-medium flex items-center gap-1">
                <Search className="w-4 h-4" />
                <span>تصفح الطلبات</span>
              </Link>
              {user && (
                <>
                  <Link to="/dashboard" className="text-gray-600 hover:text-[#2563eb] font-medium flex items-center gap-1">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>لوحة التحكم</span>
                  </Link>
                  <Link to="/create-order" className="text-[#2563eb] font-bold flex items-center gap-1 hover:underline">
                    <PlusCircle className="w-4 h-4" />
                    <span>رفع طلب جديد</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">{profile?.displayName}</p>
                  <p className="text-xs text-gray-500">{profile?.isVerified ? 'موثق' : 'غير موثق'}</p>
                </div>
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="profile" className="w-10 h-10 rounded-full border border-gray-200" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="bg-[#2563eb] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#1d4ed8] transition-all shadow-sm"
              >
                تسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
