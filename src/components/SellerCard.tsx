import React from 'react';
import { UserProfile } from '../types';
import { Star, ShieldCheck, MapPin, ExternalLink, MessageCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { PaymentIcon } from './ui/PaymentIcon';

interface SellerCardProps {
  seller: UserProfile;
}

export const SellerCard: React.FC<SellerCardProps> = ({ seller }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:shadow-blue-100/50 dark:hover:shadow-black/60 transition-all overflow-hidden group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            <img 
              src={seller.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.displayName)}&background=random`} 
              alt={seller.displayName}
              className="w-16 h-16 rounded-2xl object-cover dark:opacity-90"
              referrerPolicy="no-referrer"
            />
            {seller.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-600 border-2 border-white dark:border-gray-900 rounded-full p-1 shadow-sm">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            )}
            {seller.isFeatured && (
              <div className="absolute -top-1 -left-1 bg-yellow-400 border-2 border-white dark:border-gray-900 rounded-full p-1 shadow-sm" title="بائع متميز">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
                       <div className="bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full flex items-center gap-1 border border-orange-100/50 dark:border-orange-900/30">
                          <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                          <span className="text-orange-700 dark:text-orange-400 font-display font-black text-sm">{seller.rating.toFixed(1)}</span>
                       </div>
            {seller.avgResponseTime && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-emerald-100 dark:border-emerald-900/30">
                <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400 font-display font-black text-[9px]">{seller.avgResponseTime}</span>
              </div>
            )}
          </div>
        </div>

        <Link to={`/seller/${seller.uid}`} className="block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <h3 className="font-display font-black text-lg mb-1 text-gray-900 dark:text-white uppercase tracking-tight">{seller.displayName}</h3>
        </Link>
        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4 h-10 font-medium">
          {seller.bio || 'لا يوجد وصف متاح لهذا البائع حالياً.'}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
            {seller.specialties?.slice(0, 3).map(s => (
              <span key={s} className="bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-lg text-[10px] font-display font-black border border-blue-100/30 dark:border-blue-900/30 leading-normal uppercase tracking-tight">
                {s}
              </span>
            ))}
        </div>

        <div className="flex items-center gap-3 mb-6 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
           <PaymentIcon type="mada" className="h-5" />
           <PaymentIcon type="visa" className="h-4" />
           <PaymentIcon type="mastercard" className="h-6" />
           <PaymentIcon type="applepay" className="h-5" />
           <PaymentIcon type="stcpay" className="h-4" />
           <PaymentIcon type="tabby" className="h-5" />
           <PaymentIcon type="tamara" className="h-5" />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">
            {seller.reviewsCount} تقييم حقيقي
          </div>
          <Link 
            to={`/seller/${seller.uid}`}
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-black text-xs hover:gap-2 transition-all uppercase tracking-widest"
          >
            مشاهدة الملف
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
