import React from 'react';

// استخدام الروابط المزودة من قبل المستخدم لضمان الثبات والجودة
const USER_PROVIDED_LOGOS = {
  mada: 'https://i.imgur.com/LAn9Lss.png',
  visa: 'https://i.imgur.com/iu2GQRy.png',
  mastercard: 'https://i.imgur.com/v7eSJ8F.png',
  applepay: 'https://i.imgur.com/PpJsUN1.png',
  stcpay: 'https://cdn.moyasar.com/assets/logos/stc-pay.png'
};

interface PaymentIconProps {
  type: keyof typeof USER_PROVIDED_LOGOS;
  className?: string;
  white?: boolean;
}

export const PaymentIcon: React.FC<PaymentIconProps> = ({ type, className = "h-8", white = false }) => {
  const url = USER_PROVIDED_LOGOS[type];
  if (!url) return null;

  return (
    <div className="inline-flex items-center justify-center shrink-0">
      <img 
        src={url} 
        alt={type} 
        className={`${className} object-contain transition-all duration-300 ${white ? 'brightness-0 invert' : ''}`}
        referrerPolicy="no-referrer"
        style={{
          maxHeight: '100%',
          width: 'auto'
        }}
      />
    </div>
  );
};
