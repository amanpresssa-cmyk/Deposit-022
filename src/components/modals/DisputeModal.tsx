import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

interface DisputeModalProps {
  loading: boolean;
  reason: string;
  setReason: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({ loading, reason, setReason, onClose, onConfirm }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative">
      <div className="flex items-center gap-3 mb-6 text-red-600">
        <AlertCircle className="w-8 h-8" />
        <h3 className="text-xl font-black">فتح نزاع</h3>
      </div>
      <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed">
        يرجى توضيح سبب النزاع بدقة. سيتم مراجعة طلبك من قبل الإدارة وسنقوم بالتواصل معك.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-6 min-h-[120px] resize-none"
        placeholder="اشرح المشكلة بالتفصيل..."
      />
      <div className="flex gap-3">
        <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">إلغاء</button>
        <button onClick={onConfirm} disabled={loading || !reason.trim()} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50">تأكيد النزاع</button>
      </div>
    </motion.div>
  </motion.div>
);
