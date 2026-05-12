import React, { useEffect, useState } from 'react';
import { Twitter, Instagram, Mail, MapPin, Phone, Facebook, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PaymentIcon } from '../ui/PaymentIcon';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

import { handleFirestoreError, OperationType } from '../../lib/error-handler';

export const Footer: React.FC = () => {
  const [footerDesc, setFooterDesc] = useState('المنصة السعودية الأولى الموثوقة للوساطة المالية. نضمن حقوق البائع والمشتري بكل أمان وشفافية عبر نظام التعميد الذكي.');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'footer'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.description) setFooterDesc(data.description);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'app_settings/footer');
    });
    return () => unsub();
  }, []);

  return (
    <footer className="hidden md:block bg-[#0A0D14] pt-20 pb-10 overflow-hidden relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20 text-right">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="https://i.imgur.com/OYaLVgI.png" 
                alt="عربون" 
                className="h-10 w-auto object-contain brightness-0 invert" 
              />
              <div className="h-6 w-px bg-white/10 mx-1" />
              <span className="text-[10px] font-black text-blue-500 tracking-[0.2em] uppercase">Smart Escrow</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              {footerDesc}
            </p>
            <div className="flex gap-4">
              {[
                { icon: <Facebook className="w-4 h-4" />, label: 'Facebook' },
                { icon: <Twitter className="w-4 h-4" />, label: 'X' },
                { icon: <Instagram className="w-4 h-4" />, label: 'Instagram' }
              ].map((social, i) => (
                <a 
                  key={i}
                  href="#" 
                  className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-blue-600 transition-all border border-white/5" 
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-2">
            <h4 className="font-black text-white mb-6 text-xs uppercase tracking-widest">التنقل</h4>
            <ul className="space-y-4 font-bold text-gray-500 text-xs">
              <li><Link to="/search" className="hover:text-blue-500 transition-colors">تصفح الخدمات</Link></li>
              <li><Link to="/how-it-works" className="hover:text-blue-500 transition-colors">كيف نعمل</Link></li>
              <li><Link to="/dashboard" className="hover:text-blue-500 transition-colors">لوحة التحكم</Link></li>
              <li><Link to="/faq" className="hover:text-blue-500 transition-colors">الأسئلة الشائعة</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-black text-white mb-6 text-xs uppercase tracking-widest">الأمان والسياسات</h4>
            <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
              <p className="text-[10px] text-gray-400 font-bold leading-relaxed mb-4">
                نحن ملتزمون بأعلى معايير الحماية. يتم حجز المبالغ في حسابات ضمان آمنة تماماً.
              </p>
              <div className="space-y-3">
                <Link to="/privacy" className="flex items-center justify-between group">
                  <span className="text-[10px] font-black text-gray-400 group-hover:text-blue-500 transition-colors">سياسة الخصوصية</span>
                  <div className="text-[8px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded uppercase font-black">Secure</div>
                </Link>
                <Link to="/terms" className="flex items-center justify-between group">
                  <span className="text-[10px] font-black text-gray-400 group-hover:text-blue-500 transition-colors">شروط الاستخدام</span>
                  <div className="text-[8px] bg-white/5 text-gray-500 px-2 py-0.5 rounded uppercase font-black">v2.1</div>
                </Link>
              </div>
            </div>
          </div>

          {/* Contact Column */}
          <div className="md:col-span-3">
            <h4 className="font-black text-white mb-6 text-xs uppercase tracking-widest">تواصل معنا</h4>
            <ul className="space-y-4 font-bold text-gray-500 text-xs text-left md:text-right">
              <li className="flex items-center gap-3 justify-start md:justify-end">
                <span className="text-gray-400">الرياض، المملكة العربية السعودية</span>
                <MapPin className="w-4 h-4 text-blue-500" />
              </li>
              <li className="flex items-center gap-3 justify-start md:justify-end group">
                <a href="tel:+966501505813" className="group-hover:text-white transition-colors" dir="ltr">0501505813</a>
                <Phone className="w-4 h-4 text-blue-500" />
              </li>
              <li className="flex items-center gap-3 justify-start md:justify-end group">
                <a href="mailto:support@arboon.sa" className="group-hover:text-white transition-colors">support@arboon.sa</a>
                <Mail className="w-4 h-4 text-blue-500" />
              </li>
              <li className="flex items-center gap-3 justify-start md:justify-end">
                <span className="text-gray-400">متاحون لخدمتكم 24/7</span>
                <Clock className="w-4 h-4 text-blue-500" />
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 text-right">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em]">
              © 2026 منصة عربون. جميع الحقوق محفوظة لشركة وساطة الحلول التقنية.
            </p>
          </div>
          
          <div className="flex items-center gap-6 saturate-0 opacity-40 hover:saturate-100 hover:opacity-100 transition-all duration-700">
            <PaymentIcon type="mada" className="h-5" white />
            <PaymentIcon type="visa" className="h-4" white />
            <PaymentIcon type="mastercard" className="h-6" white />
            <PaymentIcon type="applepay" className="h-5" white />
            <PaymentIcon type="stcpay" className="h-4" white />
          </div>
        </div>
      </div>
    </footer>
  );
};

