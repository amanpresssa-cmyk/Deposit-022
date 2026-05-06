import React from 'react';

// روابط مستقرة ومعتمدة لشعارات الدفع (المصدر: Moyasar و Github Raw)
// تم اختيار هذه الروابط لضمان الاستقرار وعدم التعطل في المتصفحات المختلفة
export const PAYMENT_LOGOS = {
  mada: 'https://cdn.moyasar.com/assets/logos/mada.png',
  visa: 'https://cdn.moyasar.com/assets/logos/visa.png',
  mastercard: 'https://cdn.moyasar.com/assets/logos/mastercard.png',
  applepay: 'https://cdn.moyasar.com/assets/logos/apple-pay.png',
  googlepay: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Google_Pay_logo.svg/512px-Google_Pay_logo.svg.png',
  stcpay: 'https://cdn.moyasar.com/assets/logos/stc-pay.png'
};

interface PaymentIconProps {
  type: keyof typeof PAYMENT_LOGOS;
  className?: string;
  white?: boolean;
}

export const PaymentIcon: React.FC<PaymentIconProps> = ({ type, className = "h-4", white = false }) => {
  return (
    <img 
      src={PAYMENT_LOGOS[type]} 
      alt={type} 
      className={`${className} object-contain ${white ? 'brightness-0 invert' : ''}`}
      referrerPolicy="no-referrer"
      onError={(e) => {
        // Fallback في حال تعطل الرابط الأساسي
        const target = e.target as HTMLImageElement;
        if (type === 'mada') target.src = 'https://raw.githubusercontent.com/yalfawzan/mada-logo/master/mada-logo.png';
        if (type === 'visa') target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png';
      }}
    />
  );
};
