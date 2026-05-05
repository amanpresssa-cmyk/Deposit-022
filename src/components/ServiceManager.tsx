import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Service } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Plus, Trash2, Clock, DollarSign, Tag, Save, X, Eye, EyeOff } from 'lucide-react';

interface ServiceManagerProps {
  sellerId: string;
}

export const ServiceManager: React.FC<ServiceManagerProps> = ({ sellerId }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'تعقيب',
    deliveryTime: 'يوم واحد'
  });

  useEffect(() => {
    const q = query(
      collection(db, 'services'),
      where('sellerId', '==', sellerId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sellerId]);

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
        isActive: true,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setFormData({
        title: '',
        description: '',
        price: '',
        category: 'تعقيب',
        deliveryTime: 'يوم واحد'
      });
    } catch (error) {
      console.error("Error adding service:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    try {
      await deleteDoc(doc(db, 'services', id));
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'services', id), {
        isActive: !currentStatus
      });
    } catch (error) {
      console.error("Error updating service status:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">إدارة خدماتي</h2>
          <p className="text-gray-500 text-sm">أضف الخدمات التي تقدمها ليتمكن العملاء من طلبها مباشرة.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus className="w-5 h-5" />
          إضافة خدمة
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-[2.5rem] p-8 mb-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 mr-2">عنوان الخدمة</label>
                  <input 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="مثال: فحص فني للسيارة في الرياض"
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-gray-100 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-right"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 mr-2">التصنيف</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-white border border-gray-100 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-right appearance-none"
                  >
                    <option value="تعقيب">تعقيب</option>
                    <option value="سيارات">سيارات</option>
                    <option value="قانوني">قانوني</option>
                    <option value="برمجة">برمجة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 mr-2">وصف الخدمة</label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="اشرح ما ستقوم به بالتفصيل..."
                  rows={4}
                  className="w-full px-5 py-4 rounded-2xl bg-white border border-gray-100 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-right"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 mr-2">السعر يبدأ من (ر.س)</label>
                  <div className="relative">
                    <input 
                      required
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      placeholder="500"
                      className="w-full px-12 py-4 rounded-2xl bg-white border border-gray-100 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-right font-bold"
                    />
                    <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 mr-2">مدة التسليم المتوقعة</label>
                  <div className="relative">
                    <input 
                      required
                      value={formData.deliveryTime}
                      onChange={e => setFormData({...formData, deliveryTime: e.target.value})}
                      placeholder="مثال: يومين"
                      className="w-full px-12 py-4 rounded-2xl bg-white border border-gray-100 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-right"
                    />
                    <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                >
                  <Save className="w-6 h-6" />
                  نشر الخدمة في ملفي
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="bg-white text-gray-400 px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem]">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">لا توجد خدمات حالياً</h3>
            <p className="text-gray-400 text-sm">ابدأ بإضافة أول خدمة لك لتظهر في ملفك الشخصي.</p>
          </div>
        ) : (
          services.map(service => (
            <motion.div 
              layout
              key={service.id}
              className={`bg-white rounded-[2rem] border p-6 relative group transition-all shadow-sm ${service.isActive === false ? 'opacity-60 border-gray-200 grayscale' : 'hover:border-blue-100 border-gray-100'}`}
            >
              <div className="absolute top-4 left-4 flex gap-2">
                <button 
                  onClick={() => handleToggleActive(service.id, service.isActive !== false)}
                  title={service.isActive !== false ? 'إيقاف الخدمة' : 'تفعيل الخدمة'}
                  className={`p-2 rounded-xl transition-colors ${service.isActive !== false ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                >
                  {service.isActive !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => handleDelete(service.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors bg-gray-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${service.isActive === false ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'}`}>
                    {service.category}
                  </span>
                  {service.isActive === false && (
                    <span className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                      متوقفة
                    </span>
                  )}
                </div>
                <div>
                  <h4 className={`font-bold text-lg transition-colors line-clamp-1 ${service.isActive === false ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-600'}`}>{service.title}</h4>
                  <p className="text-gray-500 text-xs line-clamp-2 mt-1">{service.description}</p>
                </div>
                
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">يبدأ من</p>
                    <p className={`text-xl font-black ${service.isActive === false ? 'text-gray-500' : 'text-gray-900'}`}>{service.price} <span className="text-xs">ر.س</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">التسليم</p>
                    <p className="text-xs font-bold text-gray-700">{service.deliveryTime}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
