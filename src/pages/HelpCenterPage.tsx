import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  MessageSquare, 
  Phone, 
  Mail, 
  FileText, 
  Send, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  ChevronLeft,
  LifeBuoy,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const HelpCenterPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [complaintType, setComplaintType] = useState('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'support_tickets'), {
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'anonymous',
        type: 'complaint',
        category: complaintType,
        message: message,
        status: 'open',
        createdAt: serverTimestamp(),
        userName: profile?.displayName || 'زائر'
      });
      setIsSubmitted(true);
      setMessage('');
    } catch (error) {
      console.error('Error submitting ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartChat = async () => {
     // For now, we'll create a chat session in Firestore
     try {
        await addDoc(collection(db, 'support_tickets'), {
            userId: user?.uid || 'anonymous',
            userEmail: user?.email || 'anonymous',
            type: 'live_chat',
            status: 'requested',
            createdAt: serverTimestamp(),
            userName: profile?.displayName || 'زائر'
        });
        setChatOpen(true);
     } catch (e) {
        console.error(e);
     }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Hero Section */}
      <div className="bg-blue-600 pt-32 pb-48 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white/90 text-xs font-bold mb-6 border border-white/10"
          >
            <LifeBuoy className="w-4 h-4" />
            مركز الدعم والمساعدة
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">كيف يمكننا مساعدتك؟</h1>
          <p className="text-blue-100 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
            فريقنا متاح خلال أوقات الدوام (9 ص - 6 م) للإجابة على استفساراتك وحل مشكلاتك التقنية والمالية بكل سرعة واحترافية.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-24 relative z-20">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Quick Contact Cards */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-100">
               <h3 className="text-xl font-black text-gray-900 mb-8 pr-2 border-r-4 border-blue-600">تواصل مباشر</h3>
               
               <div className="space-y-4">
                  <a href="mailto:khyratfarmdates@gmail.com" className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 transition-all group">
                     <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm transition-transform group-hover:scale-110">
                        <Mail className="w-6 h-6" />
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold mb-0.5">البريد الإلكتروني</p>
                        <p className="text-sm font-black text-gray-900">khyratfarmdates@gmail.com</p>
                     </div>
                  </a>

                  <a href="tel:+966501505813" className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-green-50 transition-all group">
                     <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-green-600 shadow-sm transition-transform group-hover:scale-110">
                        <Phone className="w-6 h-6" />
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold mb-0.5">رقم الجوال الموحد</p>
                        <p className="text-sm font-black text-gray-900" dir="ltr">0501505813</p>
                     </div>
                  </a>

                  <button 
                    onClick={handleStartChat}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 group"
                  >
                     <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-sm transition-transform group-hover:scale-110">
                        <MessageCircle className="w-6 h-6" />
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-white/70 font-bold mb-0.5">محادثة مباشرة</p>
                        <p className="text-sm font-black">ابدأ الدردشة الآن</p>
                     </div>
                  </button>
               </div>
            </div>

            <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
               <div className="relative z-10">
                  <ShieldCheck className="w-10 h-10 text-blue-400 mb-4" />
                  <h4 className="text-lg font-black mb-2">أمان بياناتك أولويتنا</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">نستخدم بروتوكولات تشفير متقدمة لحماية كافة محادثاتك ومعلوماتك الشخصية المقدمة للدعم الفني.</p>
               </div>
            </div>
          </div>

          {/* Complaint Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl shadow-blue-900/5 border border-gray-100">
               <div className="flex items-center gap-4 mb-10">
                  <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                     <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                     <h2 className="text-2xl font-black text-gray-900 italic">تقديم بلاغ أو شكوى</h2>
                     <p className="text-sm text-gray-400 font-medium">نسعى جاهدين لحل كافة النزاعات بأسرع وقت ممكن.</p>
                  </div>
               </div>

               {isSubmitted ? (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="text-center py-12"
                 >
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
                       <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">تم استلام طلبك بنجاح</h3>
                    <p className="text-gray-500 font-medium mb-8">رقم الطلب الخاص بك هو: #{Math.floor(Math.random() * 10000)}</p>
                    <button 
                      onClick={() => setIsSubmitted(false)}
                      className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all"
                    >
                      إرسال بلاغ آخر
                    </button>
                 </motion.div>
               ) : (
                 <form onSubmit={handleSubmitComplaint} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-xs font-black text-gray-500 block mr-1 text-right">نوع البلاغ</label>
                          <select 
                            value={complaintType}
                            onChange={(e) => setComplaintType(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-right outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                          >
                             <option value="general">استفسار عام</option>
                             <option value="payment">مشكلة في الدفع / السحب</option>
                             <option value="seller">بلاغ ضد بائع</option>
                             <option value="technical">مشكلة تقنية في الموقع</option>
                             <option value="suggestion">اقتراح لتطوير المنصة</option>
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-xs font-black text-gray-500 block mr-1 text-right">درجة الأهمية</label>
                          <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                             {['عادي', 'عاجل'].map((p) => (
                               <button
                                 key={p}
                                 type="button"
                                 className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${p === 'عادي' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                               >
                                 {p}
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-500 block mr-1 text-right">وصف المشكلة</label>
                      <textarea 
                        rows={6}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-6 font-medium text-right outline-none focus:ring-4 focus:ring-blue-50 transition-all leading-relaxed"
                        placeholder="يرجى كتابة كافة التفاصيل لمساعدتنا في حل المشكلة بشكل أسرع..."
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-gray-800 transition-all shadow-2xl shadow-gray-200 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5 -rotate-45" />
                          إرسال الطلب الآن
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-gray-400 text-center font-medium mt-4">
                      بالضغط على إرسال، فإنك توافق على سياسة الاستخدام وخصوصية البيانات في التعامل مع الشكاوى.
                    </p>
                 </form>
               )}
            </div>
          </div>

        </div>

        {/* Live Chat Floating Window (Mockup for now) */}
        <AnimatePresence>
           {chatOpen && (
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-24 left-4 md:left-8 w-[calc(100%-2rem)] md:w-96 bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden z-50 flex flex-col h-[500px]"
              >
                 <div className="p-6 bg-blue-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/10">
                          <MessageSquare className="w-5 h-5" />
                       </div>
                       <div className="text-right">
                          <p className="font-black text-sm">المساعد الذكي</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                             <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                             <span className="text-[10px] font-bold text-white/80">متصل الآن</span>
                          </div>
                       </div>
                    </div>
                    <button onClick={() => setChatOpen(false)} className="text-white/60 hover:text-white">
                       <ChevronLeft className="w-6 h-6 rotate-90" />
                    </button>
                 </div>
                 
                 <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50 space-y-4">
                    <div className="flex justify-end">
                       <div className="bg-white p-3 rounded-2xl rounded-tr-none shadow-sm text-xs font-medium text-gray-700 max-w-[80%] text-right border border-gray-100">
                          مرحباً بك في خدمة المحادثة المباشرة، كيف يمكنني مساعدتك؟
                       </div>
                    </div>
                    {user && (
                       <div className="flex justify-start">
                          <div className="bg-blue-600 p-3 rounded-2xl rounded-tl-none shadow-md text-xs font-black text-white max-w-[80%] text-right">
                             أريد الاستفسار عن حالة طلبي الأخير.
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
                    <input 
                       type="text" 
                       placeholder="اكتب رسالتك هنا..." 
                       className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white outline-none text-right"
                    />
                    <button className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                       <Send className="w-5 h-5 -rotate-45" />
                    </button>
                 </div>
              </motion.div>
           )}
        </AnimatePresence>
      </div>
    </div>
  );
};
