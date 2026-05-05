import React from 'react';
import { Twitter, Instagram, Mail, MapPin, Phone, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="hidden md:block bg-white border-t border-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12 text-right">
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="https://i.imgur.com/OYaLVgI.png" 
                alt="عربون" 
                className="h-10 w-auto object-contain flex-shrink-0" 
              />
              <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">وساطة مالية</span>
            </Link>
            <p className="text-gray-500 text-sm leading-loose">
              المنصة الأولى الموثوقة للوساطة المالية في المملكة العربية السعودية. نضمن حقك كبائع أو مشتري بكل أمان وشفافية برقم هوية موثق.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-gray-100" title="فيسبوك">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-gray-100" title="إكس">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-gray-100" title="انستقرام">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-black text-gray-900 mb-4 text-xs uppercase tracking-[0.2em]">روابط سريعة</h4>
            <ul className="space-y-2 font-bold text-gray-500 text-xs">
              <li><Link to="/search" className="hover:text-blue-600 transition-colors">تصفح الخدمات</Link></li>
              <li><Link to="/dashboard" className="hover:text-blue-600 transition-colors">لوحة التحكم</Link></li>
              <li><Link to="/create-order" className="hover:text-blue-600 transition-colors">ابدأ صفقة جديدة</Link></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">كيف نضمن حقك؟</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-gray-900 mb-4 text-xs uppercase tracking-[0.2em]">الدعم والمساعدة</h4>
            <ul className="space-y-2 font-bold text-gray-500 text-xs">
              <li><a href="#" className="hover:text-blue-600 transition-colors">مركز المساعدة</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">سياسة الخصوصية</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">شروط الاستخدام</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">الأسئلة الشائعة</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-gray-900 mb-4 text-xs uppercase tracking-[0.2em]">تواصل معنا</h4>
            <ul className="space-y-3 font-bold text-gray-500 text-xs">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                المملكة العربية السعودية، الرياض
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                0501505813
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                support@arboon.sa
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
            © 2024 منصة عربون للوساطة الذكية. توثيق رسمي برقم هوية.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black text-gray-300 tracking-tighter">VISA</span>
            <span className="text-[10px] font-black text-gray-300 tracking-tighter">MASTERCARD</span>
            <span className="text-[10px] font-black text-gray-300 tracking-tighter">MADA</span>
            <span className="text-[10px] font-black text-gray-300 tracking-tighter">APPLE PAY</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

