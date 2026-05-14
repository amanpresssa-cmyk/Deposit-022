import React from 'react';

// استخدام روابط عالية الجودة ومستقرة لشعارات الدفع
const USER_PROVIDED_LOGOS = {
  mada: 'https://i.imgur.com/LAn9Lss.png',
  visa: 'https://i.imgur.com/iu2GQRy.png',
  mastercard: 'https://i.imgur.com/v7eSJ8F.png',
  applepay: 'https://i.imgur.com/PpJsUN1.png',
  stcpay: 'https://i.imgur.com/O6jM7q4.png',
  tabby: 'https://i.imgur.com/vHq8S7D.png',
  tamara: 'https://i.imgur.com/qL5TfRW.png'
};

interface PaymentIconProps {
  type: keyof typeof USER_PROVIDED_LOGOS;
  className?: string;
  white?: boolean;
}

export const PaymentIcon: React.FC<PaymentIconProps> = ({ type, className = "h-8", white = false }) => {
  const [error, setError] = React.useState(false);
  const url = USER_PROVIDED_LOGOS[type];
  
  if (!url) return null;

  return (
    <div className="inline-flex items-center justify-center shrink-0">
      {!error ? (
        <img 
          src={url} 
          alt={type} 
          onError={() => setError(true)}
          className={`${className} object-contain transition-all duration-300 ${white ? 'brightness-0 invert' : ''}`}
          referrerPolicy="no-referrer"
          style={{
            maxHeight: '100%',
            width: 'auto'
          }}
        />
      ) : (
        <span className="text-[8px] font-black uppercase opacity-40 tracking-tighter">{type}</span>
      )}
    </div>
  );
};
