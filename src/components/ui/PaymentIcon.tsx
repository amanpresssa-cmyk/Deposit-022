import React from 'react';

const USER_PROVIDED_LOGOS = {
  mada: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Mada_Logo.svg/512px-Mada_Logo.svg.png',
  mastercard: 'https://cdn.simpleicons.org/mastercard',
  applepay: 'https://cdn.simpleicons.org/applepay',
  stcpay: 'https://stcpay.com.sa/wp-content/uploads/2021/03/stcpay-logo.svg',
  tamara: 'https://cdn.tamara.co/assets/svg/tamara-logo-en.svg',
  tabby: 'https://checkout.tabby.ai/assets/logo.png', // fallback to png
  visa: 'https://cdn.simpleicons.org/visa',
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
  
  if (type === 'visa') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className} ${white ? 'brightness-0 invert' : ''}`}>
        <svg viewBox="0 0 130 42" className="w-full h-full object-contain">
          <path fill={white ? "#ffffff" : "#172B85"} d="M32.4128 41.0541H21.1928L12.7791 8.95549C12.3798 7.47895 11.5319 6.17361 10.2846 5.55839C7.17185 4.01231 3.74183 2.78186 0 2.16129V0.925493H18.0746C20.5691 0.925493 22.4401 2.78186 22.7519 4.93782L27.1174 28.0916L38.3319 0.925493H49.2401L32.4128 41.0541ZM55.4767 41.0541H44.8803L53.6058 0.925493H64.2022L55.4767 41.0541ZM77.9109 12.0423C78.2227 9.88101 80.0936 8.64522 82.2763 8.64522C85.7063 8.33493 89.4427 8.9555 92.5609 10.4962L94.4318 1.85637C91.3136 0.620572 87.8836 0 84.7709 0C74.4863 0 67.0026 5.5584 67.0026 13.2728C67.0026 19.1415 72.3036 22.2229 76.0454 24.0793C80.0936 25.9303 81.6527 27.1661 81.3409 29.0171C81.3409 31.7936 78.2227 33.0294 75.11 33.0294C71.3681 33.0294 67.6263 32.1039 64.2017 30.5578L62.3308 39.2031C66.0727 40.7438 70.1208 41.3644 73.8627 41.3644C85.3945 41.6693 92.5609 36.1163 92.5609 27.7813C92.5609 17.2851 77.9109 16.6699 77.9109 12.0423V12.0423ZM129.646 41.0541L121.232 0.925493H112.195C110.324 0.925493 108.453 2.16129 107.83 4.01231L92.2495 41.0541H103.158L105.335 35.1907H118.738L119.985 41.0541H129.646ZM113.754 11.732L116.867 26.8558H108.141L113.754 11.732Z"/>
        </svg>
      </div>
    );
  }

  if (type === 'tabby') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className} ${white ? 'brightness-0 invert' : ''}`}>
        <svg viewBox="0 0 200 60" className="w-full h-full object-contain">
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="56" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="-2" fill={white ? "#ffffff" : "#3FF9A9"}>
            tabby
          </text>
        </svg>
      </div>
    );
  }

  if (type === 'mada') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className} ${white ? 'brightness-0 invert' : ''}`}>
         <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Mada_Logo.svg/512px-Mada_Logo.svg.png" 
            alt="mada"
            onError={() => setError(true)}
            className={`w-full h-full object-contain ${error ? 'hidden' : 'block'}`}
         />
         {error && (
            <div className="w-full h-full border-2 border-emerald-500 rounded-lg flex items-center justify-center bg-white px-2">
               <span className="text-emerald-500 font-bold text-[10px] md:text-sm whitespace-nowrap">mada مدى</span>
            </div>
         )}
      </div>
    );
  }

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
