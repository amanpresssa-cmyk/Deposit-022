import React from 'react';
import { motion } from 'motion/react';
import { Shield, TrendingUp, Award } from 'lucide-react';

interface TrustProgressBarProps {
  level: number; // 0 to 100
}

export const TrustProgressBar: React.FC<TrustProgressBarProps> = ({ level }) => {
  const getStatus = () => {
    if (level < 30) return { text: 'مبتدئ', color: 'text-gray-400', bg: 'bg-gray-100' };
    if (level < 60) return { text: 'موثوق', color: 'text-blue-500', bg: 'bg-blue-50' };
    if (level < 90) return { text: 'نخبة', color: 'text-indigo-600', bg: 'bg-indigo-50' };
    return { text: 'أسطوري', color: 'text-orange-500', bg: 'bg-orange-50' };
  };

  const status = getStatus();

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`${status.bg} p-2 rounded-xl`}>
            <TrendingUp className={`w-5 h-5 ${status.color}`} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900">مستوى الثقة</h4>
            <p className="text-xs text-gray-400">تحسين مستوى توثيقك يزيد من ثقة النظام بك</p>
          </div>
        </div>
        <div className={`font-black text-xl ${status.color}`}>%{level}</div>
      </div>

      <div className="relative h-4 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${level}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]`}
        />
      </div>

      <div className="flex justify-between items-center text-xs font-bold">
        <span className={status.color}>{status.text}</span>
        <div className="flex gap-2">
           <div className={`w-2 h-2 rounded-full ${level >= 30 ? 'bg-blue-500' : 'bg-gray-200'}`} />
           <div className={`w-2 h-2 rounded-full ${level >= 60 ? 'bg-indigo-500' : 'bg-gray-200'}`} />
           <div className={`w-2 h-2 rounded-full ${level >= 90 ? 'bg-orange-500' : 'bg-gray-200'}`} />
        </div>
      </div>
    </div>
  );
};
