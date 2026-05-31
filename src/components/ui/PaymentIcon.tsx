import React from 'react';

const USER_PROVIDED_LOGOS = {
  mada: '/payments/mada.png',
  visa: '/payments/visa.png',
  mastercard: '/payments/mastercard.png',
  applepay: '/payments/apple_pay.png',
  tabby: '/payments/tabby.png',
  tamara: '/payments/tamara.png',
};

interface PaymentIconProps {
  type: keyof typeof USER_PROVIDED_LOGOS;
  className?: string;
  white?: boolean;
}

export const PaymentIcon: React.FC<PaymentIconProps> = ({ type, className = "h-8", white = false }) => {
  const [imgSrc, setImgSrc] = React.useState(USER_PROVIDED_LOGOS[type]);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    setImgSrc(USER_PROVIDED_LOGOS[type]);
    setError(false);
  }, [type]);
  


  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      {!error ? (
        <img 
          src={imgSrc} 
          alt={type} 
          onError={() => setError(true)}
          className={`w-full h-full object-contain transition-all duration-300 ${white ? 'brightness-0 invert' : ''}`}
        />
      ) : (
        <span className="text-[10px] md:text-sm font-black uppercase opacity-60 tracking-tighter bg-gray-100 rounded px-2 py-1">{type}</span>
      )}
    </div>
  );
};
