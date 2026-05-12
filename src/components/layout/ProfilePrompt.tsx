import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { UserCircle, ShieldCheck, PlusCircle, ArrowLeft, X, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const ProfilePrompt: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptType, setPromptType] = useState<'profile' | 'service' | null>(null);
  const [hasCheckedServices, setHasCheckedServices] = useState(false);

  useEffect(() => {
    if (!user || !profile || location.pathname.startsWith('/admin')) {
      setShowPrompt(false);
      return;
    }

    // Check if profile is incomplete
    const isProfileIncomplete = 
      profile.displayName === 'مستخدم جديد' || 
      !profile.phoneNumber || 
      profile.verificationStatus === 'none';

    if (isProfileIncomplete) {
      setPromptType('profile');
      setShowPrompt(true);
      return;
    }

    // Check if user has services (only if profile is complete)
    const checkServices = async () => {
      if (hasCheckedServices) return;
      try {
        const q = query(
          collection(db, 'orders'),
          where('sellerId', '==', user.uid),
          where('visibility', '==', 'public'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setPromptType('service');
          setShowPrompt(true);
        }
        setHasCheckedServices(true);
      } catch (err) {
        console.error('Error checking services:', err);
      }
    };

    if (!isProfileIncomplete) {
      checkServices();
    }
  }, [user, profile, location.pathname]);

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 md:p-6 bg-black/20 backdrop-blur-[2px]">
        <motion.div
           initial={{ y: 100, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           exit={{ y: 100, opacity: 0 }}
           className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-blue-50 overflow-hidden"
        >
          <div className="relative p-8 text-right">
            <button 
              onClick={() => setShowPrompt(false)}
              className="absolute top-6 left-6 p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              {promptType === 'profile' ? (
                 <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center mb-6">
                   <UserCircle className="w-8 h-8" />
                 </div>
              ) : (
                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-[1.5rem] flex items-center justify-center mb-6">
                   <PlusCircle className="w-8 h-8" />
                 </div>
              )}

              <h3 className="text-2xl font-black text-gray-900 mb-2 italic">
                {promptType === 'profile' ? 'اكمل بياناتك لتزيد موثوقيتك' : 'ابدأ بتقديم خدماتك الآن'}
              </h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                {promptType === 'profile' 
                  ? 'يلاحظ العملاء دائماً الملفات الشخصية المكتملة والموثقة. أضف اسمك الحقيقي ورقم هاتفك لتبدأ أولى صفقاتك بكل أمان.' 
                  : 'منصة عربون تتيح لك عرض خدماتك كمقدم خدمة (معقب، وسيط، مبرمج...) بشكل محترم واحترافي. أضف خدمتك الأولى الآن واجعلها متاحة للجميع.'}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowPrompt(false);
                  navigate(promptType === 'profile' ? '/settings' : '/create-order');
                }}
                className={`w-full py-4 rounded-2xl font-black text-white shadow-xl flex items-center justify-center gap-2 group transition-all ${
                  promptType === 'profile' ? 'bg-blue-600 shadow-blue-100 hover:bg-blue-700' : 'bg-purple-600 shadow-purple-100 hover:bg-purple-700'
                }`}
              >
                <span>{promptType === 'profile' ? 'استكمال ملفي الشخصي' : 'إضافة خدمتي الأولى'}</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setShowPrompt(false)}
                className="w-full py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
              >
                سأفعل ذلك لاحقاً
              </button>
            </div>

            {promptType === 'service' && (
              <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-loose">
                  بمجرد إضافة خدمتك، ستظهر في نتائج البحث العام وسنروج لها في المنصة.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
