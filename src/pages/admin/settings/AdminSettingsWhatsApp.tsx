import React, { useEffect, useState } from 'react';
import { 
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Save,
  Smartphone,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast as hotToast } from 'sonner';

const PlatformWhatsAppInput: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchPhone = async () => {
      try {
        const res = await fetch('/api/admin/whatsapp/platform-phone');
        if (res.ok) {
          const data = await res.json();
          setPhone(data.phone || '');
        }
      } catch {}
      setLoaded(true);
    };
    fetchPhone();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/whatsapp/platform-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      if (res.ok) {
        hotToast.success('تم حفظ رقم الواتساب بنجاح ✅');
      } else {
        hotToast.error('فشل حفظ الرقم');
      }
    } catch {
      hotToast.error('تعذّر الاتصال بالخادم');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="p-6 rounded-3xl border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/10 space-y-4 mt-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-xs font-black text-gray-900 dark:text-white">رقم واتساب المنصة (للإرسال)</p>
          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 leading-relaxed">
            الرقم الذي سيُستخدم لإرسال الإشعارات للعملاء. يجب أن يطابق الرقم الذي مسحت منه رمز QR.
          </p>
        </div>
      </div>
      <div className="flex gap-3 items-center">
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="مثال: 966501234567"
          dir="ltr"
          className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-400 transition-colors"
        />
        <button
          onClick={handleSave}
          disabled={saving || !phone.trim()}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all hover:scale-[1.02] flex items-center gap-1.5 shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          حفظ
        </button>
      </div>
    </div>
  );
};

export const AdminSettingsWhatsApp: React.FC = () => {
  const [statusData, setStatusData] = useState<any>({ status: 'disconnected', qrCode: '', error: '' });
  const [checking, setChecking] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch (e) {
      console.error("Failed to fetch WhatsApp status:", e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    if (!window.confirm('إعادة تعيين الجلسة؟')) return;
    setActionLoading(true);
    try {
      await fetch('/api/admin/whatsapp/reset');
      fetchStatus();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight ">ربط <span className="text-blue-600">الواتساب</span></h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">تفعيل نظام الإشعارات والتواصل الآلي</p>
        </div>
        <div className="flex gap-2">
          <Link 
            to="/admin/settings"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-bold text-[11px] transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            رجوع للإعدادات
          </Link>
          <Link 
            to="/admin"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-xl font-bold text-[11px] transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            لوحة الإدارة
          </Link>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
        <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white border border-blue-100 flex items-center justify-center shadow-sm shrink-0">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-black text-sm mb-1 text-gray-900">إدارة الواتساب</h4>
            <p className="text-[10px] font-bold text-gray-400 leading-relaxed ">
              اربط رقم الواتساب الخاص بالمنصة لإرسال الإشعارات والتواصل مع العملاء.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-1 p-6 rounded-3xl border border-gray-100 bg-gray-50/50 text-center space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">حالة الاتصال</p>
            <div className="py-2">
           {statusData.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/30 rounded-full text-xs font-black uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" /> متصل ✅
                  </span>
               ) : statusData.status === 'QR_READY' ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30 rounded-full text-xs font-black uppercase tracking-wider animate-pulse">
                    <Clock className="w-3.5 h-3.5" /> بانتظار المسح 🔗
                  </span>
               ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30 rounded-full text-xs font-black uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5" /> غير متصل 🔌
                  </span>
               )}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold leading-normal">
              {statusData.status === 'connected'
                ? 'الروبوت نشط بالكامل ويرسل تنبيهات المنصة في الوقت الحقيقي.'
                : 'الروبوت متوقف حالياً ولا يمكنه إرسال إشعارات للعملاء.'}
            </p>
          </div>

          <div className="md:col-span-2 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/40 text-center space-y-4">
            {checking ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs font-black text-gray-400 dark:text-gray-500 ">جاري فحص حالة الواتساب...</p>
              </div>
            ) : statusData.status === 'connected' ? (
              <div className="py-6 space-y-4">
                <div className="w-16 h-16 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800/30 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h5 className="font-black text-gray-900 dark:text-white text-sm">نظام الواتساب نشط بالكامل!</h5>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-1 max-w-sm mx-auto leading-relaxed">
                    السيرفر الآن مربوط بجوالك المعتمد وجاهز لإرسال الإشعارات وتلقي ردود الدردشة.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 rounded-2xl p-4 text-right space-y-2 max-w-sm mx-auto">
                  <p className="text-[10px] font-black text-blue-800 dark:text-blue-400">🧪 اختبار الإرسال المباشر</p>
                  <div className="flex gap-2">
                    <input
                      id="test-phone-input"
                      type="tel"
                      placeholder="966501234567"
                      dir="ltr"
                      className="flex-1 border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={async () => {
                        const phoneEl = document.getElementById('test-phone-input') as HTMLInputElement;
                        const phone = phoneEl?.value?.trim();
                        if (!phone) { hotToast.error('أدخل الرقم أولاً'); return; }
                        try {
                          const res = await fetch('/api/admin/whatsapp/test-send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phone })
                          });
                          const data = await res.json();
                          if (data.success) {
                            hotToast.success(`✅ تم الإرسال إلى ${data.sentTo}`);
                          } else {
                            hotToast.error(`❌ ${data.error}`);
                          }
                        } catch {
                          hotToast.error('فشل الاتصال بالخادم');
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-black text-xs transition-all"
                    >
                      إرسال
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/admin/whatsapp/diagnostics');
                        const data = await res.json();
                        console.log('📊 WhatsApp Diagnostics:', data);
                        const msg = `الحالة: ${data.whatsappStatus}\nمستخدمون مفعّلون: ${data.usersWithWhatsApp?.length || 0}\nإشعارات حديثة: ${data.recentNotifications?.length || 0}\n\nالتفاصيل في Developer Console (F12)`;
                        alert(msg);
                      } catch {
                        hotToast.error('فشل جلب التشخيص');
                      }
                    }}
                    className="text-blue-500 hover:text-blue-700 text-[9px] font-bold underline"
                  >
                    📊 عرض التشخيص الكامل (Console)
                  </button>
                </div>

                <button
                  onClick={handleReset}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-red-900/10 transition-all hover:scale-[1.01]"
                >
                  {actionLoading ? 'جاري إلغاء الربط...' : 'تسجيل الخروج وقطع الاتصال 🔌'}
                </button>
              </div>

            ) : statusData.qrCode ? (
              <div className="py-4 space-y-4">
                <div className="text-right mb-4 flex flex-col items-center">
                  <h5 className="font-black text-gray-900 dark:text-white text-sm">🔗 امسح الرمز التالي بجوالك</h5>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-0.5 leading-relaxed">
                    افتح تطبيق الواتساب ← الأجهزة المرتبطة ← ربط جهاز ← امسح الرمز:
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl mx-auto inline-block shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(statusData.qrCode)}`}
                    alt="Scan QR"
                    className="w-48 h-48 block rounded-lg select-none"
                  />
                </div>
                <div className="pt-2 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center text-xs">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold">بانتظار المسح والمصادقة...</span>
                  <button
                    onClick={handleReset}
                    disabled={actionLoading}
                    className="text-blue-500 hover:text-blue-600 font-black text-[10px] underline flex items-center gap-1"
                  >
                    ♻️ إعادة توليد الرمز
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 space-y-5">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <h5 className="font-black text-gray-900 dark:text-white text-sm">ابدأ ربط الواتساب بالمنصة</h5>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-1 max-w-sm mx-auto leading-relaxed">
                    اضغط على الزر أدناه وسيظهر رمز QR خلال ثوانٍ. امسحه بتطبيق الواتساب على الجوال المخصص للمنصة.
                  </p>
                </div>

                {statusData.error && (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl text-right space-y-1 max-w-md mx-auto">
                    <p className="text-[10px] font-black text-red-800 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      خطأ في الخادم:
                    </p>
                    <p className="text-[9px] text-red-700 dark:text-red-400 leading-relaxed font-bold break-all font-mono bg-white dark:bg-gray-900 p-3 rounded-xl border border-red-50 dark:border-red-900/20">
                      {statusData.error}
                    </p>
                  </div>
                )}

                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        const res = await fetch('/api/admin/whatsapp/reset');
                        if (res.ok) {
                          hotToast.success('جاري توليد رمز QR، انتظر ثوانٍ...');
                          setTimeout(fetchStatus, 2500);
                        } else {
                          hotToast.error('تعذّر بدء الربط، تحقق من السيرفر');
                        }
                      } catch {
                        hotToast.error('تعذّر الاتصال بالخادم');
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-blue-900/15 transition-all hover:scale-[1.02] flex items-center gap-2"
                  >
                    {actionLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> جاري التجهيز...</>
                    ) : (
                      <><MessageSquare className="w-4 h-4" /> ابدأ ربط الواتساب 🔗</>
                    )}
                  </button>
                  {statusData.error && (
                    <button
                      onClick={handleReset}
                      disabled={actionLoading}
                      className="text-gray-400 hover:text-gray-600 font-bold text-[10px] underline"
                    >
                      ♻️ إعادة ضبط الجلسة بالقوة
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <PlatformWhatsAppInput />
      </div>
    </div>
  );
};
