import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Lock, Bell, CreditCard, Settings, Save, CheckCircle2,
  AlertTriangle, Smartphone, Upload, Image as ImageIcon, Building,
  Eye, EyeOff, ExternalLink, ShieldAlert, ShieldCheck, Globe,
  MessageSquare, ChevronLeft, Wallet, Info, X
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp, getDocs, collection, query, where, limit } from 'firebase/firestore';
import { PhoneVerification } from '../components/PhoneVerification';
import { IdentityVerification } from '../components/IdentityVerification';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { sendNotification } from '../lib/notificationService';

type Section = 'profile' | 'security' | 'notifications' | 'financial' | 'platform';

const SECTIONS = [
  { id: 'profile',       label: 'الملف الشخصي',     icon: User,         color: 'blue'   },
  { id: 'security',      label: 'الأمان والخصوصية', icon: Lock,         color: 'amber'  },
  { id: 'notifications', label: 'التنبيهات',         icon: Bell,         color: 'green'  },
  { id: 'financial',     label: 'المعلومات المالية', icon: CreditCard,   color: 'purple' },
  { id: 'platform',      label: 'إعدادات المنصة',   icon: Settings,     color: 'rose', adminOnly: true },
] as const;

const colorMap: Record<string, { bg: string; text: string; ring: string; light: string }> = {
  blue:   { bg: 'bg-blue-600',   text: 'text-blue-600',   ring: 'ring-blue-100 dark:ring-blue-900/30',   light: 'bg-blue-50 dark:bg-blue-900/20'   },
  amber:  { bg: 'bg-amber-500',  text: 'text-amber-500',  ring: 'ring-amber-100 dark:ring-amber-900/30', light: 'bg-amber-50 dark:bg-amber-900/20'  },
  green:  { bg: 'bg-green-600',  text: 'text-green-600',  ring: 'ring-green-100 dark:ring-green-900/30', light: 'bg-green-50 dark:bg-green-900/20'  },
  purple: { bg: 'bg-violet-600', text: 'text-violet-600', ring: 'ring-violet-100 dark:ring-violet-900/30',light:'bg-violet-50 dark:bg-violet-900/20'},
  rose:   { bg: 'bg-rose-600',   text: 'text-rose-600',   ring: 'ring-rose-100 dark:ring-rose-900/30',   light: 'bg-rose-50 dark:bg-rose-900/20'   },
};

// ── Reusable sub-components ──────────────────────────────────────────────────

const FieldHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium flex items-start gap-1.5 mt-1.5 leading-snug">
    <Info className="w-3 h-3 shrink-0 mt-0.5 text-gray-300 dark:text-gray-600" />
    {children}
  </p>
);

const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="text-[11px] font-black text-gray-500 dark:text-gray-400 block uppercase tracking-widest mb-1.5">
    {children}{required && <span className="text-red-400 mr-1">*</span>}
  </label>
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  color?: string;
  disabled?: boolean;
}> = ({ checked, onChange, color = 'bg-blue-600', disabled }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0
      ${checked ? color : 'bg-gray-200 dark:bg-gray-700'}
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${checked ? 'right-0.5' : 'right-6'}`} />
  </button>
);

const SectionSaveBar: React.FC<{
  loading: boolean;
  saved: boolean;
  onSave: () => void;
  label?: string;
}> = ({ loading, saved, onSave, label = 'حفظ التغييرات' }) => (
  <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
    <AnimatePresence>
      {saved && (
        <motion.span
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-black"
        >
          <CheckCircle2 className="w-4 h-4" />
          تم الحفظ بنجاح
        </motion.span>
      )}
      {!saved && <span />}
    </AnimatePresence>
    <button
      onClick={onSave}
      disabled={loading}
      className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-gray-700 dark:hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
    >
      {loading
        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        : <Save className="w-4 h-4" />
      }
      {label}
    </button>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 ${className}`}>
    {children}
  </div>
);

const SectionHeader: React.FC<{ icon: React.ElementType; title: string; desc: string; color: string }> = ({
  icon: Icon, title, desc, color
}) => {
  const c = colorMap[color];
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-10 h-10 rounded-xl ${c.light} ${c.text} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-lg font-black text-gray-900 dark:text-white leading-none">{title}</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const { user, profile, toggle2FA } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [loadingSection, setLoadingSection] = useState<Section | null>(null);
  const [savedSection, setSavedSection] = useState<Section | null>(null);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showIdentityVerification, setShowIdentityVerification] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Guard against double-save (e.g. double-click)
  const savingRef = useRef(false);

  const [form, setForm] = useState({
    displayName:              profile?.displayName || user?.displayName || '',
    bio:                      profile?.bio || '',
    bannerUrl:                profile?.bannerUrl || '',
    phoneNumber:              profile?.phoneNumber || '',
    isPrivate:                profile?.isPrivate || false,
    twoFactorEnabled:         profile?.twoFactorEnabled || false,
    notificationsEnabled:     profile?.notificationsEnabled !== false,
    pushNotificationsEnabled: profile?.pushNotificationsEnabled !== false,
    orderNotificationsEnabled:profile?.orderNotificationsEnabled !== false,
    systemAlertsEnabled:      profile?.systemAlertsEnabled !== false,
    emailNotifications:       profile?.emailNotifications !== false,
    whatsappEnabled:          profile?.whatsappEnabled === true,
    whatsappNumber:           profile?.whatsappNumber || '',
    payoutBank:               profile?.payoutBank || '',
    payoutIban:               profile?.payoutIban || '',
    payoutAccountName:        profile?.payoutAccountName || '',
  });

  React.useEffect(() => {
    if (!profile) return;
    setForm(prev => ({
      ...prev,
      displayName:              profile.displayName || user?.displayName || '',
      bio:                      profile.bio || '',
      bannerUrl:                profile.bannerUrl || '',
      phoneNumber:              profile.phoneNumber || '',
      isPrivate:                profile.isPrivate || false,
      twoFactorEnabled:         profile.twoFactorEnabled || false,
      notificationsEnabled:     profile.notificationsEnabled !== false,
      pushNotificationsEnabled: profile.pushNotificationsEnabled !== false,
      orderNotificationsEnabled:profile.orderNotificationsEnabled !== false,
      systemAlertsEnabled:      profile.systemAlertsEnabled !== false,
      emailNotifications:       profile.emailNotifications !== false,
      whatsappEnabled:          profile.whatsappEnabled === true,
      whatsappNumber:           profile.whatsappNumber || '',
      payoutBank:               profile.payoutBank || '',
      payoutIban:               profile.payoutIban || '',
      payoutAccountName:        profile.payoutAccountName || '',
    }));
  }, [profile, user]);

  const set = (key: keyof typeof form, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const markSaved = (section: Section) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 3000);
  };

  // ── Validate phone ──────────────────────────────────────────────────────
  const validatePhone = (num: string) => {
    if (!num) return true;
    const d = num.replace(/\D/g, '');
    return /^05\d{8}$/.test(d) || /^9665\d{8}$/.test(d) || /^009665\d{8}$/.test(d);
  };

  const validateIban = (iban: string) => {
    if (!iban) return true;
    return /^SA\d{22}$/i.test(iban.trim());
  };

  // ── Save: Profile ───────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!user || savingRef.current) return;
    if (!form.displayName.trim()) { toast.error('الاسم الكامل مطلوب'); return; }
    if (form.phoneNumber && !validatePhone(form.phoneNumber)) {
      toast.error('رقم الجوال غير صحيح. الصيغ المقبولة: 05XXXXXXXX أو 9665XXXXXXXX'); return;
    }
    if (form.phoneNumber && form.phoneNumber !== profile?.phoneNumber) {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('phoneNumber', '==', form.phoneNumber), limit(1)));
        if (!snap.empty) { toast.error('رقم الجوال مسجل لحساب آخر'); return; }
      } catch (queryErr: any) {
        console.warn('[saveProfile] phoneNumber uniqueness check skipped:', queryErr?.code);
      }
    }
    savingRef.current = true;
    setLoadingSection('profile');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: form.displayName.trim(),
        bio: form.bio,
        bannerUrl: form.bannerUrl,
        phoneNumber: form.phoneNumber,
        updatedAt: serverTimestamp(),
      });
      markSaved('profile');
      toast.success('تم حفظ الملف الشخصي');
    } catch (e: any) {
      console.error('[saveProfile] Firestore error:', e?.code, e?.message);
      if (e?.code === 'permission-denied') toast.error('ليس لديك صلاحية تعديل هذه البيانات');
      else if (e?.message?.includes('exceeds the maximum') || e?.code === 'invalid-argument')
        toast.error('حجم الصورة كبير جداً على قاعدة البيانات. جرب صورة أصغر (أقل من 200 كيلوبايت)');
      else toast.error('حدث خطأ أثناء الحفظ — ' + (e?.code || 'خطأ غير معروف'));
    } finally { setLoadingSection(null); savingRef.current = false; }
  };

  // ── Save: Security ──────────────────────────────────────────────────────
  const saveSecurity = async () => {
    if (!user || savingRef.current) return;
    savingRef.current = true;
    setLoadingSection('security');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isPrivate: form.isPrivate,
        updatedAt: serverTimestamp(),
      });
      markSaved('security');
      toast.success('تم حفظ إعدادات الأمان');
    } catch (e: any) {
      console.error('[saveSecurity] Firestore error:', e?.code, e?.message);
      toast.error('حدث خطأ أثناء الحفظ — ' + (e?.code || 'خطأ غير معروف'));
    } finally { setLoadingSection(null); savingRef.current = false; }
  };

  // ── Save: Notifications ─────────────────────────────────────────────────
  const saveNotifications = async () => {
    if (!user || savingRef.current) return;

    // Validate format first (client-side, no Firestore needed)
    if (form.whatsappEnabled && form.whatsappNumber && !validatePhone(form.whatsappNumber)) {
      toast.error('رقم الواتساب غير صحيح. الصيغ المقبولة: 05XXXXXXXX أو 9665XXXXXXXX'); return;
    }

    savingRef.current = true;
    setLoadingSection('notifications');
    try {
      // Uniqueness check for WhatsApp number (skip silently if Firestore rejects query)
      if (form.whatsappEnabled && form.whatsappNumber && form.whatsappNumber !== profile?.whatsappNumber) {
        try {
          const snap = await getDocs(query(collection(db, 'users'), where('whatsappNumber', '==', form.whatsappNumber), limit(1)));
          if (!snap.empty && snap.docs[0].id !== user.uid) {
            toast.error('رقم الواتساب مربوط بحساب آخر');
            savingRef.current = false;
            setLoadingSection(null);
            return;
          }
        } catch (queryErr: any) {
          // Firestore rules may not allow querying by whatsappNumber — skip check and proceed
          console.warn('[saveNotifications] whatsappNumber uniqueness check skipped:', queryErr?.code);
        }
      }

      await updateDoc(doc(db, 'users', user.uid), {
        notificationsEnabled:      form.notificationsEnabled,
        pushNotificationsEnabled:  form.pushNotificationsEnabled,
        orderNotificationsEnabled: form.orderNotificationsEnabled,
        systemAlertsEnabled:       form.systemAlertsEnabled,
        emailNotifications:        form.emailNotifications,
        whatsappEnabled:           form.whatsappEnabled,
        whatsappNumber:            form.whatsappNumber,
        updatedAt: serverTimestamp(),
      });

      const isNewWA  = form.whatsappEnabled && !profile?.whatsappEnabled;
      const isNewNum = form.whatsappEnabled && profile?.whatsappEnabled && form.whatsappNumber !== profile?.whatsappNumber;
      if (isNewWA || isNewNum) {
        sendNotification(
          user.uid,
          '🎉 تم تفعيل تنبيهات الواتساب',
          'تم ربط حسابك بنجاح. ستصلك إشعارات صفقاتك مباشرة على واتساب.',
          'system',
          'normal'
        ).catch(err => console.warn('[saveNotifications] sendNotification failed:', err));
      }

      markSaved('notifications');
      toast.success('تم حفظ إعدادات التنبيهات');
    } catch (e: any) {
      console.error('[saveNotifications] Firestore error:', e?.code, e?.message);
      toast.error('حدث خطأ أثناء الحفظ — ' + (e?.code || 'خطأ غير معروف'));
    } finally { setLoadingSection(null); savingRef.current = false; }
  };

  // ── Save: Financial ─────────────────────────────────────────────────────
  const saveFinancial = async () => {
    if (!user || savingRef.current) return;
    if (!validateIban(form.payoutIban)) {
      toast.error('رقم الآيبان غير صحيح. يجب أن يبدأ بـ SA ويتبعه 22 رقماً'); return;
    }
    savingRef.current = true;
    setLoadingSection('financial');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        payoutBank:        form.payoutBank,
        payoutIban:        form.payoutIban.toUpperCase().trim(),
        payoutAccountName: form.payoutAccountName,
        updatedAt: serverTimestamp(),
      });
      markSaved('financial');
      toast.success('تم حفظ المعلومات المالية');
    } catch (e: any) {
      console.error('[saveFinancial] Firestore error:', e?.code, e?.message);
      toast.error('حدث خطأ أثناء الحفظ — ' + (e?.code || 'خطأ غير معروف'));
    } finally { setLoadingSection(null); savingRef.current = false; }
  };

  // ── Banner upload ───────────────────────────────────────────────────────
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error('حجم الصورة كبير جداً. الحد الأقصى 500 كيلوبايت');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => set('bannerUrl', reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;
  const visibleSections = SECTIONS.filter(s => !(s as any).adminOnly || isAdmin);
  const waDigits = form.whatsappNumber.replace(/\D/g, '');
  const waValid = form.whatsappNumber === '' || /^05\d{8}$/.test(waDigits) || /^9665\d{8}$/.test(waDigits) || /^009665\d{8}$/.test(waDigits);
  const ibanValid = validateIban(form.payoutIban);

  const activeColor = colorMap[visibleSections.find(s => s.id === activeSection)?.color || 'blue'];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 md:py-10 pb-24 md:pb-10" dir="rtl">

      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">إعدادات الحساب</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">إدارة بياناتك الشخصية، الأمان، التنبيهات، والمعلومات المالية</p>
      </div>

      <div className="flex gap-6 items-start">

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <nav className="hidden md:flex flex-col gap-1 w-52 flex-shrink-0 sticky top-24">
          {visibleSections.map(s => {
            const c = colorMap[s.color];
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id as Section)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-right w-full
                  ${active
                    ? `${c.light} ${c.text} ring-1 ${c.ring}`
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                <s.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{s.label}</span>
                {active && <ChevronLeft className="w-3.5 h-3.5 opacity-50" />}
              </button>
            );
          })}

          {/* Profile quick card */}
          <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
            <img
              src={profile?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.displayName)}&background=6366f1&color=fff`}
              className="w-14 h-14 rounded-xl object-cover mx-auto mb-2 ring-2 ring-white dark:ring-gray-800 shadow"
              alt="صورتك"
              referrerPolicy="no-referrer"
            />
            <p className="text-xs font-black text-gray-900 dark:text-white leading-tight truncate">{form.displayName || 'بدون اسم'}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{user?.email}</p>
            <div className="mt-2 flex items-center justify-center gap-1">
              {profile?.verificationStatus === 'verified'
                ? <span className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />موثق</span>
                : <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full font-black">غير موثق</span>
              }
            </div>
          </div>
        </nav>

        {/* ── Mobile tab bar ──────────────────────────────────────────── */}
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-100 dark:border-gray-800 flex overflow-x-auto no-scrollbar px-2 py-1.5 gap-1">
          {visibleSections.map(s => {
            const c = colorMap[s.color];
            const active = activeSection === s.id;
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id as Section)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg flex-shrink-0 text-[10px] font-black transition-all ${active ? `${c.text} ${c.light}` : 'text-gray-400'}`}>
                <s.icon className="w-4 h-4" />
                <span>{s.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">

            {/* ═══════════════════════════════════════════════════════════
                SECTION 1 — الملف الشخصي
            ═══════════════════════════════════════════════════════════ */}
            {activeSection === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <SectionHeader icon={User} title="الملف الشخصي" desc="بياناتك الظاهرة للمستخدمين الآخرين" color="blue" />

                {/* Personal Info */}
                <Card>
                  <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">المعلومات الأساسية</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>الاسم الكامل</FieldLabel>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.displayName}
                          onChange={e => set('displayName', e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-right dark:text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all"
                          placeholder="الاسم الثلاثي"
                        />
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600" />
                      </div>
                      <FieldHint>اسمك كما يراه المشترون في ملفك الشخصي</FieldHint>
                    </div>
                    <div>
                      <FieldLabel>رقم الجوال</FieldLabel>
                      <div className="relative">
                        <input
                          type="tel"
                          value={form.phoneNumber}
                          onChange={e => set('phoneNumber', e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-right dark:text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all"
                          placeholder="05XXXXXXXX"
                        />
                        <Smartphone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600" />
                      </div>
                      <FieldHint>يُستخدم للتواصل الداخلي فقط — لا يُعرض للعامة</FieldHint>
                    </div>
                  </div>

                  <div className="mt-4">
                    <FieldLabel>النبذة التعريفية</FieldLabel>
                    <textarea
                      rows={3}
                      value={form.bio}
                      onChange={e => set('bio', e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium text-right dark:text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all resize-none leading-relaxed"
                      placeholder="أخبر العملاء بتخصصك وخبراتك..."
                    />
                    <FieldHint>كلما كانت نبذتك أوضح، زادت ثقة العملاء بك وارتفع ترتيبك في البحث</FieldHint>
                  </div>
                </Card>

                {/* Banner */}
                <Card>
                  <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">صورة الغلاف</h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-4">المقاس الأمثل: 1200×400 بكسل — الحد الأقصى: 500 كيلوبايت</p>

                  <label className="group relative w-full h-40 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                    {form.bannerUrl ? (
                      <>
                        <img src={form.bannerUrl} className="absolute inset-0 w-full h-full object-cover" alt="غلاف" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-xs font-black gap-2">
                          <Upload className="w-5 h-5" /> تغيير الغلاف
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-600">
                        <ImageIcon className="w-10 h-10" />
                        <span className="text-xs font-black">اضغط لرفع صورة غلاف</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                  </label>

                  {form.bannerUrl && (
                    <button
                      onClick={() => set('bannerUrl', '')}
                      className="mt-2 flex items-center gap-1.5 text-[11px] text-red-500 font-black hover:text-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> حذف الغلاف
                    </button>
                  )}

                  <FieldHint>صورة الغلاف تظهر في ملفك الشخصي وتعطي انطباعاً احترافياً للعملاء</FieldHint>
                </Card>

                <SectionSaveBar loading={loadingSection === 'profile'} saved={savedSection === 'profile'} onSave={saveProfile} />
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                SECTION 2 — الأمان والخصوصية
            ═══════════════════════════════════════════════════════════ */}
            {activeSection === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <SectionHeader icon={Lock} title="الأمان والخصوصية" desc="تحكم في أمان حسابك ومستوى ظهوره" color="amber" />

                {/* Toggles */}
                <Card>
                  <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">إعدادات الخصوصية</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <Toggle checked={form.isPrivate} onChange={() => set('isPrivate', !form.isPrivate)} color="bg-purple-600" />
                      <div className="flex-1 text-right">
                        <p className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 justify-end">
                          {form.isPrivate ? <EyeOff className="w-4 h-4 text-purple-500" /> : <Eye className="w-4 h-4 text-gray-400" />}
                          حساب خاص
                        </p>
                        <FieldHint>يخفي ملفك من نتائج البحث للزوار غير المسجلين وغير المعروفين</FieldHint>
                      </div>
                    </div>
                    <hr className="border-gray-100 dark:border-gray-800" />
                    <div className="flex items-center justify-between gap-4">
                      <Toggle
                        checked={form.twoFactorEnabled}
                        color="bg-amber-500"
                        onChange={async () => {
                          if (!form.twoFactorEnabled) {
                            if (!profile?.phoneNumber) { setShowPhoneVerification(true); return; }
                            await toggle2FA(true);
                            set('twoFactorEnabled', true);
                          } else {
                            await toggle2FA(false);
                            set('twoFactorEnabled', false);
                          }
                        }}
                      />
                      <div className="flex-1 text-right">
                        <p className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 justify-end">
                          <ShieldCheck className="w-4 h-4 text-amber-500" />
                          التحقق بخطوتين (2FA)
                        </p>
                        <FieldHint>
                          {profile?.phoneNumber
                            ? 'رمز OTP يصل لجوالك عند كل تسجيل دخول جديد من جهاز مجهول'
                            : 'يتطلب توثيق رقم الجوال أولاً — اضغط لبدء التوثيق'}
                        </FieldHint>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Verification cards */}
                <Card>
                  <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">التوثيق والهوية</h3>
                  <div className="space-y-3">
                    {/* Phone */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <div>
                        {profile?.phoneNumber
                          ? <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> موثق
                            </span>
                          : <button onClick={() => setShowPhoneVerification(true)} className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-lg font-black hover:bg-blue-700 transition-all">
                              ابدأ التوثيق
                            </button>
                        }
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 justify-end">
                          <Smartphone className="w-4 h-4 text-blue-400" />
                          توثيق رقم الجوال
                        </p>
                        <FieldHint>يرفع مستوى موثوقيتك ويتيح التحقق بخطوتين</FieldHint>
                      </div>
                    </div>

                    {/* Identity */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <div>
                        {profile?.verificationStatus === 'verified'
                          ? <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> موثق
                            </span>
                          : profile?.verificationStatus === 'pending'
                            ? <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg font-black">قيد المراجعة</span>
                            : <button onClick={() => setShowIdentityVerification(true)} className="text-xs bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-4 py-1.5 rounded-lg font-black hover:opacity-80 transition-all">
                                التحقق الآن
                              </button>
                        }
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 justify-end">
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          التحقق من الهوية
                        </p>
                        <FieldHint>توثيق بطاقتك الوطنية — إلزامي لبعض الخدمات وتحويل المبالغ الكبيرة</FieldHint>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Legal links */}
                <Card>
                  <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">المستندات القانونية</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { to: '/terms', label: 'شروط الاستخدام', icon: Globe, color: 'text-blue-500' },
                      { to: '/privacy', label: 'سياسة الخصوصية', icon: Lock, color: 'text-violet-500' },
                      { to: '/faq', label: 'الأسئلة الشائعة', icon: MessageSquare, color: 'text-green-500' },
                    ].map(l => (
                      <Link key={l.to} to={l.to} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group">
                        <l.icon className={`w-4 h-4 ${l.color}`} />
                        <span className="text-[10px] font-black text-gray-600 dark:text-gray-400 text-center leading-tight">{l.label}</span>
                        <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-400 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </Card>

                <SectionSaveBar loading={loadingSection === 'security'} saved={savedSection === 'security'} onSave={saveSecurity} label="حفظ إعدادات الأمان" />
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                SECTION 3 — التنبيهات
            ═══════════════════════════════════════════════════════════ */}
            {activeSection === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <SectionHeader icon={Bell} title="التنبيهات والإشعارات" desc="تحكم فيما تتلقاه من تنبيهات وعبر أي قناة" color="green" />

                {/* App notifications */}
                <Card>
                  <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">تنبيهات التطبيق</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'notificationsEnabled',     label: 'إشعارات المنصة',        hint: 'تنبيهات الطلبات والرسائل المباشرة داخل التطبيق',          color: 'bg-blue-600'  },
                      { key: 'pushNotificationsEnabled', label: 'إشعارات الدفع (Push)',   hint: 'تنبيهات فورية على المتصفح حتى عند إغلاق التطبيق',       color: 'bg-indigo-600'},
                      { key: 'orderNotificationsEnabled',label: 'تحديثات الطلبات',       hint: 'إشعار فوري عند تغيير حالة صفقة (قبول، تسليم، إكمال)',    color: 'bg-blue-600'  },
                      { key: 'systemAlertsEnabled',      label: 'تنبيهات النظام',        hint: 'إشعارات الصيانة والتحديثات الهامة في المنصة',            color: 'bg-slate-600' },
                      { key: 'emailNotifications',       label: 'إشعارات البريد الإلكتروني',hint: 'تلقي ملخص أسبوعي ومستجدات مهمة عبر بريدك الإلكتروني',color: 'bg-blue-600'  },
                    ].map((item, idx, arr) => (
                      <React.Fragment key={item.key}>
                        <div className="flex items-center justify-between gap-4">
                          <Toggle
                            checked={form[item.key as keyof typeof form] as boolean}
                            onChange={() => set(item.key as keyof typeof form, !form[item.key as keyof typeof form])}
                            color={item.color}
                          />
                          <div className="flex-1 text-right">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{item.label}</p>
                            <FieldHint>{item.hint}</FieldHint>
                          </div>
                        </div>
                        {idx < arr.length - 1 && <hr className="border-gray-100 dark:border-gray-800" />}
                      </React.Fragment>
                    ))}
                  </div>
                </Card>

                {/* WhatsApp */}
                <Card className="border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10">
                  <div className="flex items-center justify-between mb-1">
                    <Toggle
                      checked={form.whatsappEnabled}
                      onChange={() => set('whatsappEnabled', !form.whatsappEnabled)}
                      color="bg-green-600"
                    />
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 justify-end">
                        <span className="text-base">💬</span> تنبيهات الواتساب
                      </p>
                      <FieldHint>استقبل إشعارات صفقاتك مباشرة على واتساب وارد على الطلبات بكلمات بسيطة</FieldHint>
                    </div>
                  </div>

                  <AnimatePresence>
                    {form.whatsappEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 mt-4 border-t border-green-100 dark:border-green-900/30 space-y-3">
                          <div>
                            <FieldLabel>رقم الواتساب</FieldLabel>
                            <div className="relative">
                              <input
                                type="tel"
                                dir="ltr"
                                value={form.whatsappNumber}
                                onChange={e => set('whatsappNumber', e.target.value.replace(/[^\d+\s-]/g, ''))}
                                className={`w-full bg-white dark:bg-gray-800 border rounded-xl px-4 py-3 pr-10 text-sm font-bold text-left outline-none transition-all
                                  ${!waValid ? 'border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30'
                                             : 'border-green-200 dark:border-green-800 focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/30'}`}
                                placeholder="+9665XXXXXXXX أو 05XXXXXXXX"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base">
                                {form.whatsappNumber === '' ? '💬' : waValid ? '✅' : '❌'}
                              </span>
                            </div>
                            {!waValid && form.whatsappNumber !== '' && (
                              <p className="text-[11px] text-red-600 font-black mt-1">الصيغ المقبولة: 05XXXXXXXX | +9665XXXXXXXX | 9665XXXXXXXX</p>
                            )}
                            {waValid && form.whatsappNumber !== '' && (
                              <p className="text-[11px] text-green-600 dark:text-green-400 font-black mt-1">✅ الرقم صحيح وجاهز</p>
                            )}
                          </div>

                          {/* Commands reference */}
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-green-100 dark:border-green-900/30">
                            <p className="text-[10px] font-black text-green-700 dark:text-green-400 mb-2 uppercase tracking-widest">الأوامر المتاحة عبر الواتساب</p>
                            <div className="space-y-1">
                              {[
                                ['مستحقاتي', 'عرض مستحقاتك المتاحة والمحجوزة'],
                                ['طلباتي', 'قائمة صفقاتك النشطة'],
                                ['موافقة / رفض', 'الرد على طلبات بانتظار موافقتك'],
                                ['استلام [رمز]', 'تأكيد استلام العمل وتحرير المبلغ'],
                                ['رد [رمز]: رسالة', 'إرسال رسالة لمحادثة طلب'],
                              ].map(([cmd, desc]) => (
                                <div key={cmd} className="flex items-center justify-between text-[10px]">
                                  <span className="text-gray-400 dark:text-gray-500">{desc}</span>
                                  <code className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded font-black">{cmd}</code>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>

                <SectionSaveBar loading={loadingSection === 'notifications'} saved={savedSection === 'notifications'} onSave={saveNotifications} label="حفظ إعدادات التنبيهات" />
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                SECTION 4 — المعلومات المالية
            ═══════════════════════════════════════════════════════════ */}
            {activeSection === 'financial' && (
              <motion.div key="financial" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <SectionHeader icon={CreditCard} title="المعلومات المالية" desc="بيانات حسابك البنكي لاستلام مستحقاتك" color="purple" />

                {/* Warning */}
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                    هذه المعلومات تُستخدم حصراً لتحويل مستحقاتك من الصفقات الناجحة. تأكد من دقة رقم الـ IBAN لتجنب تأخير التسويات.
                  </p>
                </div>

                <Card>
                  <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">بيانات الحساب البنكي</h3>
                  <div className="space-y-4">
                    {/* Bank */}
                    <div>
                      <FieldLabel>اسم البنك</FieldLabel>
                      <div className="relative">
                        <select
                          value={form.payoutBank}
                          onChange={e => set('payoutBank', e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-right dark:text-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all appearance-none"
                        >
                          <option value="">اختر البنك...</option>
                          <option value="stc_pay">اس تي سي بنك (STC Bank)</option>
                          <option value="alrajhi">مصرف الراجحي</option>
                          <option value="snbe">البنك الأهلي السعودي</option>
                          <option value="alinma">بنك الإنماء</option>
                          <option value="riyad">بنك الرياض</option>
                          <option value="bsf">البنك السعودي الفرنسي</option>
                          <option value="sab">البنك العربي الوطني</option>
                          <option value="jazira">بنك الجزيرة</option>
                          <option value="other">بنك آخر</option>
                        </select>
                        <Building className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600 pointer-events-none" />
                      </div>
                      <FieldHint>اختر البنك الذي تريد استلام المبالغ فيه</FieldHint>
                    </div>

                    {/* Account name */}
                    <div>
                      <FieldLabel>اسم صاحب الحساب</FieldLabel>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.payoutAccountName}
                          onChange={e => set('payoutAccountName', e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-right dark:text-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all"
                          placeholder="كما يظهر في بطاقتك البنكية"
                        />
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600" />
                      </div>
                      <FieldHint>يجب أن يتطابق تماماً مع الاسم المسجل في البنك — الأخطاء تؤدي لرفض التحويل</FieldHint>
                    </div>

                    {/* IBAN */}
                    <div>
                      <FieldLabel>رقم الآيبان (IBAN)</FieldLabel>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.payoutIban}
                          onChange={e => set('payoutIban', e.target.value.toUpperCase())}
                          className={`w-full bg-gray-50 dark:bg-gray-800 border rounded-xl px-4 py-3 pr-10 text-sm font-bold uppercase tracking-widest text-right dark:text-white outline-none transition-all
                            ${form.payoutIban && !ibanValid
                              ? 'border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30'
                              : 'border-gray-200 dark:border-gray-700 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900/30'}`}
                          placeholder="SA29XXXXXXXXXXXXXXXXXXXX"
                          dir="ltr"
                        />
                        <Wallet className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 dark:text-gray-600" />
                      </div>
                      {form.payoutIban && !ibanValid && (
                        <p className="text-[11px] text-red-600 font-black mt-1">❌ يجب أن يبدأ بـ SA ويتبعه 22 رقماً (مثال: SA29 8030 0000...)</p>
                      )}
                      {form.payoutIban && ibanValid && (
                        <p className="text-[11px] text-green-600 dark:text-green-400 font-black mt-1">✅ رقم الآيبان صحيح</p>
                      )}
                      <FieldHint>يبدأ بـ SA ويتبعه 22 رقماً — تجده في تطبيق البنك أو كشف الحساب</FieldHint>
                    </div>
                  </div>
                </Card>

                {/* Security badge */}
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                  <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-[11px] text-green-700 dark:text-green-400 font-bold">بياناتك المالية مشفرة ومحمية — لا يمكن لأحد الوصول إليها سواك</p>
                </div>

                <SectionSaveBar loading={loadingSection === 'financial'} saved={savedSection === 'financial'} onSave={saveFinancial} label="حفظ المعلومات المالية" />
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                SECTION 5 — إعدادات المنصة (Admin)
            ═══════════════════════════════════════════════════════════ */}
            {activeSection === 'platform' && isAdmin && (
              <motion.div key="platform" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <SectionHeader icon={Settings} title="إعدادات المنصة" desc="إعدادات حصرية للمديرين فقط" color="rose" />

                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-widest">Admin Only</span>
                    <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">تحكم النظام</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      { label: 'وضع الصيانة', desc: 'تجميد جميع العمليات', active: false, color: 'bg-slate-600' },
                      { label: 'التحقق الإلزامي', desc: 'إلزام المستخدمين بالتوثيق', active: true, color: 'bg-rose-600' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <Toggle checked={item.active} onChange={() => {}} color={item.color} />
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-900 dark:text-white">{item.label}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Color theme */}
                <Card>
                  <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">اللون الأساسي للمنصة</h3>
                  <div className="flex gap-3 flex-wrap">
                    {['#3b82f6','#10b981','#f43f5e','#8b5cf6','#f59e0b','#000000'].map(c => (
                      <button key={c} className={`w-10 h-10 rounded-xl border-4 border-white dark:border-gray-800 shadow-sm transition-all hover:scale-110 active:scale-95 ${profile?.primaryColor === c ? 'ring-4 ring-offset-1 ring-gray-400' : ''}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <FieldHint>يؤثر على لون الأزرار والعناصر الرئيسية في واجهة المنصة</FieldHint>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPhoneVerification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <PhoneVerification
                onSuccess={() => { setShowPhoneVerification(false); toast.success('تم توثيق رقم الجوال بنجاح'); }}
                onClose={() => setShowPhoneVerification(false)}
              />
            </motion.div>
          </div>
        )}
        {showIdentityVerification && (
          <IdentityVerification onClose={() => setShowIdentityVerification(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};
