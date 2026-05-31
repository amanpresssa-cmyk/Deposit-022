import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Save, X, Image as ImageIcon, Link as LinkIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({ isOpen, onClose, sellerId }) => {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'تعقيب',
    deliveryTime: 'يوم واحد',
    imageUrl: '',
    externalUrl: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 500 كيلوبايت لضمان سرعة التصفح.');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price) return;

    try {
      await addDoc(collection(db, 'services'), {
        sellerId,
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
        deliveryTime: formData.deliveryTime,
        imageUrl: formData.imageUrl || null,
        externalUrl: formData.externalUrl || null,
        isActive: true,
        createdAt: serverTimestamp()
      });
      toast.success('تمت إضافة الخدمة بنجاح!');
      setFormData({
        title: '',
        description: '',
        price: '',
        category: 'تعقيب',
        deliveryTime: 'يوم واحد',
        imageUrl: '',
        externalUrl: ''
      });
      onClose();
    } catch (error) {
      console.error("Error adding service:", error);
      toast.error('حدث خطأ أثناء إضافة الخدمة');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900">إضافة خدمة جديدة</h2>
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} id="add-service-form" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 mr-2">عنوان الخدمة</label>
                    <input 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="مثال: فحص فني للسيارة في الرياض"
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-right font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 mr-2">التصنيف</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-right font-medium appearance-none"
                    >
                      <option value="تعقيب">تعقيب</option>
                      <option value="سيارات">سيارات</option>
                      <option value="قانوني">قانوني</option>
                      <option value="برمجة">برمجة</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 mr-2">السعر (ر.س)</label>
                    <input 
                      required
                      type="number"
                      min="1"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      placeholder="أقل سعر للخدمة..."
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-right font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 mr-2">مدة التنفيذ</label>
                    <select 
                      value={formData.deliveryTime}
                      onChange={e => setFormData({...formData, deliveryTime: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-right font-medium appearance-none"
                    >
                      <option value="ساعة واحدة">ساعة واحدة</option>
                      <option value="يوم واحد">يوم واحد</option>
                      <option value="يومين">يومين</option>
                      <option value="ثلاثة أيام">ثلاثة أيام</option>
                      <option value="أسبوع">أسبوع</option>
                      <option value="غير محدد">غير محدد</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 mr-2 flex items-center gap-2">
                         <Upload className="w-4 h-4 text-blue-500" />
                         صورة الخدمة (اختياري)
                      </label>
                      <div className="relative">
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="modal-service-image-upload"
                        />
                        <label 
                          htmlFor="modal-service-image-upload"
                          className="flex flex-col items-center justify-center w-full h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all overflow-hidden group"
                        >
                           {formData.imageUrl ? (
                             <img src={formData.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                           ) : (
                             <div className="flex flex-col items-center gap-2 py-4">
                                <ImageIcon className="w-8 h-8 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">رفع صورة (بحد أقصى 500KB)</p>
                             </div>
                           )}
                           {uploadingImage && (
                             <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                             </div>
                           )}
                        </label>
                        {formData.imageUrl && (
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, imageUrl: ''})}
                            className="absolute -top-2 -left-2 bg-red-100 text-red-600 p-1.5 rounded-xl shadow-lg hover:bg-red-200 transition-all border border-red-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 mr-2 flex items-center gap-2">
                         <LinkIcon className="w-4 h-4 text-blue-500" />
                         رابط فيديو أو معاينة خارجي
                      </label>
                      <input 
                        value={formData.externalUrl}
                        onChange={e => setFormData({...formData, externalUrl: e.target.value})}
                        placeholder="https://example.com/demo"
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-left font-mono text-sm"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2 h-full flex flex-col">
                      <label className="text-sm font-bold text-gray-700 mr-2">وصف الخدمة</label>
                      <textarea 
                        required
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="اشرح ما ستقوم به بالتفصيل..."
                        className="w-full flex-1 px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-right font-medium resize-none min-h-[140px]"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
              <button 
                form="add-service-form"
                type="submit"
                className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2"
              >
                <Save className="w-6 h-6" />
                حفظ ونشر الخدمة
              </button>
              <button 
                type="button"
                onClick={onClose}
                className="px-8 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-200 transition-all bg-gray-100 border border-gray-200"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
