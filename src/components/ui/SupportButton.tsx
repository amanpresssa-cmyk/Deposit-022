import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, Rocket, Shield, User, Headphones, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { sendAdminNotification } from '../../lib/notificationService';
import { GoogleGenAI } from "@google/genai";
import { getGemini } from "../../lib/gemini";

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user' | 'agent';
  timestamp: Date;
}

const SYSTEM_PROMPT = `أنت "مساعد عربون الذكي" (الروبوت الخاص بمنصة عربون). منصة عربون هي منصة وساطة مالية (Escrow) تضمن حقوق البائع والمشتري في السعودية.
مميزات المنصة:
1. نظام "العربون" (التعميد): يحفظ المشتري مبلغه في المنصة، ولا يتم تحويله للبائع إلا بعد تأكيد استلام الخدمة.
2. التوثيق: نلزم المستخدمين (خاصة البائعين) بتوثيق هويتهم الوطنية لضمان الجدية والأمان.
3. معقبين وخدمات محترفة: المنصة تركز على خدمات التعقيب، الخدمات القانونية، وخدمات السيارات بشكل أساسي.
4. الخصوصية: التواصل يجب أن يكون داخل المنصة لضمان الحقوق في حال حدوث نزاع.
5. العمولات: عمولة المنصة تنافسية وضئيلة تهدف لاستدامة الخدمة (عادة يتحملها البائع أو حسب الاتفاق).

قواعدك:
- أجب بلهجة سعودية/عربية مهذبة وودودة.
- وجه المستخدمين دائماً نحو "التوثيق" إذا كانوا بائعين.
- اشرح للمشترين أن أموالهم في أمان طالما أنهم يدفعون عبر نظام "العربون" في المنصة.
- إذا لم تعرف الإجابة، اقترح عليهم "التحدث مع أحد ممثلي الخدمة" من الخيارات المتاحة.
- لا تقدم معلومات عن التواصل خارج المنصة أبداً.`;

export const SupportButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
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
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle auto-reappear after 5 minutes
  useEffect(() => {
    const checkHiddenStatus = () => {
      const hiddenUntil = localStorage.getItem('support_bot_hidden_until');
      if (hiddenUntil) {
        const expiration = parseInt(hiddenUntil);
        if (Date.now() < expiration) {
          setIsHidden(true);
          const remaining = expiration - Date.now();
          const timer = setTimeout(() => setIsHidden(false), remaining);
          return timer;
        } else {
          setIsHidden(false);
          localStorage.removeItem('support_bot_hidden_until');
        }
      }
      return null;
    };

    const timer = checkHiddenStatus();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const hideBot = (e: React.MouseEvent) => {
    e.stopPropagation();
    const expiration = Date.now() + 5 * 60 * 1000;
    localStorage.setItem('support_bot_hidden_until', expiration.toString());
    setIsHidden(true);
    setIsOpen(false);
  };

  // Initialize Gemini lazily to prevent crashes if API key is missing on startup
  const getAI = () => {
    try {
      return getGemini();
    } catch (error) {
      if (error instanceof Error && error.message === 'API_KEY_MISSING') {
        throw new Error("عذراً، لم يتم إعداد مفتاح الذكاء الاصطناعي الخاص بالمنصة بعد.");
      }
      throw error;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, isTyping]);

  const addMessage = (text: string, sender: 'user' | 'bot' | 'agent') => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      text,
      sender,
      timestamp: new Date()
    }]);
  };

  const getAIResponse = async (userText: string) => {
    setIsTyping(true);
    try {
      const ai = getAI();
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: 'user', parts: [{ text: userText }] }
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT
        }
      });

      const responseText = response.text || "عذراً، لم أستطع معالجة طلبك حالياً.";
      addMessage(responseText, 'bot');
    } catch (error) {
      console.error("Gemini Error:", error);
      addMessage("عذراً، أواجه مشكلة بسيطة في الاتصال. هل تود تجربة خيار التحدث مع الدعم الفني؟", 'bot');
    } finally {
      setIsTyping(false);
    }
  };

  const handleBotOption = (option: string) => {
    if (isTyping) return;
    addMessage(option, 'user');
    
    if (option === 'التحدث مع خدمة العملاء') {
      setTimeout(() => {
        setChatMode('agent');
        addMessage('جاري تحويلك لأحد ممثلي الخدمة... يرجى الانتظار.', 'bot');
        sendAdminNotification('طلب محادثة فورية', `المستخدم ${user?.email || 'زائر'} يرغب في التحدث مع الدعم الفني الآن.`, user?.uid);
        setTimeout(() => {
          addMessage('أهلاً بك، أنا "عمر" من فريق الدعم. كيف يمكنني مساعدتك؟ (ملاحظة: هذا النظام قيد التطوير وسيتم الرد عليك قريباً عبر إشعارات المنصة)', 'agent');
        }, 2000);
      }, 600);
    } else {
      getAIResponse(option);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;
    
    const text = inputText.trim();
    addMessage(text, 'user');
    setInputText('');

    if (chatMode === 'bot') {
      await getAIResponse(text);
    } else {
      // In agent mode, we'd normally sync with a backend
      setTimeout(() => {
        addMessage('فهمت، سأقوم بإحالة طلبك لفريق العمل وسيأتيك الرد فور توفره.', 'agent');
      }, 1000);
    }
  };

  if (isHidden) return null;

  return (
    <div className="fixed bottom-28 md:bottom-8 left-6 md:left-8 z-[60] md:z-40 flex flex-col items-start gap-4 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            className="fixed inset-0 md:relative md:inset-auto z-[60] md:z-auto w-full h-[100dvh] md:h-auto md:w-96 md:max-h-[600px] bg-white md:rounded-[2.5rem] border-0 md:border border-gray-100 md:shadow-2xl flex flex-col overflow-hidden pointer-events-auto rtl"
            dir="rtl"
          >
              {/* Header */}
              <div className="bg-blue-600 p-4 md:p-6 text-white shrink-0">
                <div className="flex items-center justify-between">
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
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50/50">
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
                
                {isTyping && (
                  <div className="flex justify-start">
                     <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex gap-1 items-center">
                        <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce"></div>
                     </div>
                  </div>
                )}

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
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 pointer-events-auto shrink-0 pb-4">
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

      <div className="relative pointer-events-auto flex items-center gap-1.5 translate-y-1">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
            animate={{ 
              y: isOpen ? 0 : [0, -8, 0],
            }}
            transition={{ 
              repeat: isOpen ? 0 : Infinity,
              duration: 2.5,
              ease: "easeInOut"
            }}
            className={`w-14 h-14 md:w-16 md:h-16 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-200 hover:scale-110 active:scale-95 transition-all relative ${isOpen ? 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto' : 'opacity-100'}`}
          >
            <MessageCircle className="w-7 h-7 md:w-8 md:h-8" />
            {!isOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 border-4 border-white rounded-full"></span>
            )}
        </motion.button>

        {!isOpen && (
          <button 
            onClick={hideBot}
            className="w-8 h-8 md:w-9 md:h-9 bg-gray-100/80 backdrop-blur-sm text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all border border-gray-100 group relative shadow-sm"
            title="إخفاء لمدة 5 دقائق"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">
              إخفاء 5 دقايق
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
