import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, Rocket, Shield, User, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { sendAdminNotification } from '../../lib/notificationService';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user' | 'agent';
  timestamp: Date;
}

export const SupportButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'مرحباً بك في منصة عربون! أنا مساعدك الذكي. كيف يمكنني خدمتك اليوم؟',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [chatMode, setChatMode] = useState<'bot' | 'agent'>('bot');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const addMessage = (text: string, sender: 'user' | 'bot' | 'agent') => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      text,
      sender,
      timestamp: new Date()
    }]);
  };

  const handleBotOption = (option: string) => {
    addMessage(option, 'user');
    
    setTimeout(() => {
      if (option === 'التحدث مع خدمة العملاء') {
        setChatMode('agent');
        addMessage('جاري تحويلك لأحد ممثلي الخدمة... يرجى الانتظار.', 'bot');
        sendAdminNotification('طلب محادثة فورية', `المستخدم ${user?.email || 'زائر'} يرغب في التحدث مع الدعم الفني الآن.`, user?.uid);
        setTimeout(() => {
          addMessage('أهلاً بك، أنا "عمر" من فريق الدعم. كيف يمكنني مساعدتك؟ (ملاحظة: هذا النظام قيد التطوير وسيتم الرد عليك قريباً عبر إشعارات المنصة)', 'agent');
        }, 2000);
      } else if (option === 'كيف أقوم بطلبي الأول؟') {
        addMessage('الأمر بسيط! ابحث عن الخدمة التي تحتاجها، اضغط على "طلب الخدمة"، قم بوصف متطلباتك، ثم ادفع العربون بأمان. سنحفظ أموالك حتى تستلم الخدمة وتؤكد الرضا عنها.', 'bot');
      } else if (option === 'سياسة استخدام عربون') {
        addMessage('منصة عربون تضمن حق الطرفين. يمنع التواصل خارج المنصة، ويتم حفظ الأموال في (التعميد) حتى اكتمال العمل. عمولتنا هي الأقل لضمان استمرارية الخدمة والأمان.', 'bot');
      }
    }, 600);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    addMessage(inputText, 'user');
    setInputText('');

    if (chatMode === 'bot') {
      setTimeout(() => {
        addMessage('فهمت استفسارك. هل تود التحدث مع أحد موظفينا لمزيد من التفاصيل؟', 'bot');
      }, 1000);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="w-80 md:w-96 bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl flex flex-col overflow-hidden pointer-events-auto max-h-[500px] md:max-h-[600px] rtl"
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-blue-600 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    {chatMode === 'bot' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-black text-xs md:text-sm">{chatMode === 'bot' ? 'مساعد عربون الذكي' : 'الدعم المباشر'}</h4>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      <span className="text-[10px] font-bold opacity-80">متصل الآن</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50/50 min-h-[300px]">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 md:p-4 rounded-2xl text-xs md:text-sm font-medium leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-100' 
                      : msg.sender === 'agent'
                      ? 'bg-red-50 text-red-600 border border-red-100 rounded-tl-none'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
              
              {chatMode === 'bot' && (
                <div className="grid grid-cols-1 gap-2 pt-4">
                  <button 
                    onClick={() => handleBotOption('التحدث مع خدمة العملاء')}
                    className="flex items-center justify-between p-3 md:p-4 bg-white border border-gray-100 rounded-2xl text-[10px] md:text-xs font-black text-blue-600 hover:border-blue-200 transition-all text-right shadow-sm group"
                  >
                    <span>التحدث مع أحد ممثلي الخدمة</span>
                    <Headphones className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                  </button>
                  <button 
                    onClick={() => handleBotOption('كيف أقوم بطلبي الأول؟')}
                    className="flex items-center justify-between p-3 md:p-4 bg-white border border-gray-100 rounded-2xl text-[10px] md:text-xs font-black text-gray-700 hover:border-blue-200 transition-all text-right shadow-sm group"
                  >
                    <span>كيف أقوم بطلبي الأول؟</span>
                    <Rocket className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                  </button>
                  <button 
                    onClick={() => handleBotOption('سياسة استخدام عربون')}
                    className="flex items-center justify-between p-3 md:p-4 bg-white border border-gray-100 rounded-2xl text-[10px] md:text-xs font-black text-gray-700 hover:border-blue-200 transition-all text-right shadow-sm group"
                  >
                    <span>سياسة استخدام منصة عربون</span>
                    <Shield className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                  </button>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 pointer-events-auto">
              <div className="relative">
                <input 
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="اكتب استفسارك هنا..."
                  className="w-full pl-12 pr-4 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs md:text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all rtl text-right"
                />
                <button 
                  type="submit"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-100"
                >
                  <Send className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        animate={{ 
          y: isOpen ? 0 : [0, -10, 0],
        }}
        transition={{ 
          repeat: isOpen ? 0 : Infinity,
          duration: 2,
          ease: "easeInOut"
        }}
        className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-200 hover:scale-110 active:scale-95 transition-all pointer-events-auto relative"
      >
        <MessageCircle className="w-7 h-7 md:w-8 md:h-8" />
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 border-4 border-white rounded-full"></span>
        )}
      </motion.button>
    </div>
  );
};
