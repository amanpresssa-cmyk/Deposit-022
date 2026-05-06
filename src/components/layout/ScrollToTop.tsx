import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    // إذا كان الرابط يحتوي على hash (مثل #about)، ننتقل للعنصر المطلوب مباشرة
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // الانتقال للأعلى عند تغيير المسار (pathname)
    // نستخدم 'auto' بدلاً من 'smooth' عند تغيير الصفحات بالكامل لتجنب الشعور بالبطء
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto'
    });
  }, [pathname, hash, key]);

  return null;
};

export default ScrollToTop;
