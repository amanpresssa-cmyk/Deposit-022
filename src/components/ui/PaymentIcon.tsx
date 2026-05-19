import React from 'react';

// استخدام روابط عالية الجودة ومستقرة لشعارات الدفع
const USER_PROVIDED_LOGOS = {
  mada: 'https://cdn.checkout.com/market/mada.svg',
  visa: 'https://cdn.checkout.com/market/visa.svg',
  mastercard: 'https://cdn.checkout.com/market/mastercard.svg',
  applepay: 'https://cdn.checkout.com/market/applepay.svg',
  stcpay: 'https://raw.githubusercontent.com/stc-pay/branding/master/logos/stc-pay-logo.png',
  tabby: 'https://tabby.ai/favicon.ico',
  tamara: 'https://tamara.co/favicon.ico'
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
          onError={(e) => {
            setError(true);
            // Try fallback URL if the primary one fails
            if (type === 'tabby') (e.target as HTMLImageElement).src = 'https://i.imgur.com/vHq8S7D.png';
            if (type === 'tamara') (e.target as HTMLImageElement).src = 'https://i.imgur.com/qL5TfRW.png';
          }}
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
