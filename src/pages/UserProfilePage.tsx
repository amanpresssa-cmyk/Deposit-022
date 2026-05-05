import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Settings, ShieldCheck, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export const UserProfilePage: React.FC = () => {
  const { profile } = useAuth();

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        {/* Header Cover & Avatar */}
        <div className="h-48 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
          <div className="absolute -bottom-16 right-8">
            <div className="w-32 h-32 rounded-3xl bg-white p-2 shadow-xl border border-gray-100">
              <div className="w-full h-full rounded-[1.2rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-4xl font-black text-indigo-600 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name || ''} className="w-full h-full object-cover" />
                ) : (
                  profile?.full_name?.[0]?.toUpperCase() || <UserIcon />
                )}
              </div>
            </div>
          </div>
          
          <div className="absolute top-6 left-6">
            <Link 
              to="/settings" 
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-white transition-all font-bold text-sm"
            >
              <Settings className="w-4 h-4" />
              تعديل الإعدادات
            </Link>
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-20 px-8 pb-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
              {profile.full_name || 'مستخدم جديد'}
              {(profile.role === 'admin' || profile.isAdmin) && (
                <span className="bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-[10px] uppercase tracking-wider font-black px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  مدير النظام
                </span>
              )}
            </h1>
            {profile.phone && (
              <p className="text-gray-500 font-medium text-lg" dir="ltr">{profile.phone}</p>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 flex items-center justify-center rounded-xl shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 mb-1">البريد الإلكتروني</span>
                <span className="font-bold text-gray-800 break-all">{profile.email || 'لم يتم إضافة بريد إلكتروني'}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 flex items-center justify-center rounded-xl shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 mb-1">المدينة (الإعدادات الافتراضية)</span>
                <span className="font-bold text-gray-800 break-all">{profile.preferences?.defaultCity || 'لم يتم التحديد'}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
