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
      className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-100/50 transition-all overflow-hidden group"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            <img 
              src={seller.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.displayName)}&background=random`} 
              alt={seller.displayName}
              className="w-16 h-16 rounded-2xl object-cover"
              referrerPolicy="no-referrer"
            />
            {seller.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-600 border-2 border-white rounded-full p-1 shadow-sm">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            )}
            {seller.isFeatured && (
              <div className="absolute -top-1 -left-1 bg-yellow-400 border-2 border-white rounded-full p-1 shadow-sm" title="بائع متميز">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex bg-orange-50 px-3 py-1 rounded-full items-center gap-1">
              <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="text-orange-700 font-bold text-sm">{seller.rating.toFixed(1)}</span>
            </div>
            {seller.avgResponseTime && (
              <div className="bg-green-50 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-green-100">
                <Clock className="w-3 h-3 text-green-600" />
                <span className="text-green-700 font-bold text-[10px]">{seller.avgResponseTime}</span>
              </div>
            )}
          </div>
        </div>

        <Link to={`/seller/${seller.uid}`} className="block group-hover:text-blue-600 transition-colors">
          <h3 className="font-bold text-lg mb-1">{seller.displayName}</h3>
        </Link>
        <p className="text-gray-600 text-sm line-clamp-2 mb-4 h-10">
          {seller.bio || 'لا يوجد وصف متاح لهذا البائع حالياً.'}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {seller.specialties?.slice(0, 3).map(s => (
            <span key={s} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black">
              {s}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-6">
           <PaymentIcon type="mada" className="h-6" />
           <PaymentIcon type="visa" className="h-5" />
           <PaymentIcon type="mastercard" className="h-7" />
           <PaymentIcon type="applepay" className="h-6" />
           <PaymentIcon type="stcpay" className="h-5" />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          <div className="text-xs text-gray-500 font-bold">
            {seller.reviewsCount} تقييم
          </div>
          <Link 
            to={`/seller/${seller.uid}`}
            className="flex items-center gap-1 text-blue-600 font-bold text-sm hover:gap-2 transition-all"
          >
            زيارة الملف
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
