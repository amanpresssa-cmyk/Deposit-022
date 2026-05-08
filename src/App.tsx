import React, { Component, ReactNode, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import { CreateOrderPage } from './pages/CreateOrderPage';
import { SearchPage } from './pages/SearchPage';
import { SellerProfilePage } from './pages/SellerProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminFinance } from './pages/admin/AdminFinance';
import { AdminDisputes } from './pages/admin/AdminDisputes';
import { AdminSupport } from './pages/admin/AdminSupport';
import { AdminTransactions } from './pages/admin/AdminTransactions';
import { AdminRevenue } from './pages/admin/AdminRevenue';
import { AdminSettlements } from './pages/admin/AdminSettlements';
import { AdminSettings } from './pages/admin/AdminSettings';
import { SystemLogsPage } from './pages/admin/SystemLogsPage';
import { useLocation } from 'react-router-dom';
import { HelpCenterPage } from './pages/HelpCenterPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { FAQPage } from './pages/FAQPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { NotificationProvider } from './components/providers/NotificationProvider';
import { Toaster } from 'sonner';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import ScrollToTop from './components/layout/ScrollToTop';
import { SupportButton } from './components/ui/SupportButton';
import { BottomNav } from './components/layout/BottomNav';
import { InstallPWAHint } from './components/layout/InstallPWAHint';
import { ProductTour } from './components/layout/ProductTour';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X, Ban, LogOut, Phone, MessageCircle } from 'lucide-react';
import { FloatingScrollToTop } from './components/ui/FloatingScrollToTop';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { toast } from 'sonner';

import { PhoneVerification } from './components/PhoneVerification';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  public state: any = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: any): any {
    return { hasError: true, error };
  }

  public componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6 rtl" dir="rtl">
          <div className="bg-white p-8 rounded-[2.5rem] border border-red-100 shadow-xl max-w-md text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-gray-900 mb-2">عذراً، حدث خطأ تقني</h2>
            <p className="text-gray-500 mb-6">واجه النظام مشكلة أثناء تحميل الصفحة. يرجى محاولة التحديث.</p>
            <pre className="text-[10px] bg-gray-50 p-4 rounded-xl overflow-auto text-left mb-6 max-h-40">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

function BlockedUserOverlay({ reason, showSupport = true }: { reason?: string, showSupport?: boolean }) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[1000] bg-gray-900 flex items-center justify-center p-6 text-right"
      dir="rtl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-[5rem] -mr-8 -mt-8 opacity-50"></div>
        
        <div className="relative">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-red-100/50">
            <Ban className="w-10 h-10" />
          </div>

          <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight">حسابك <span className="text-red-600 underline decoration-red-100">محظور</span> حالياً</h2>
          
          <div className="bg-red-50/50 border-2 border-red-50 p-6 rounded-3xl mb-8">
            <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">سبب الحظر الرئيسي</p>
            <p className="text-gray-700 font-bold leading-relaxed">
              {reason || 'تم تعطيل دخولك للنظام لمخالفة شروط وأحكام منصة "عربون".'}
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-gray-400 text-sm font-medium leading-relaxed">
              {showSupport 
                ? 'إذا كنت تعتقد أن هذا الحظر كان ناتجاً عن خطأ، يمكنك التواصل مباشرة مع المدير العام للمنصة لمراجعة طلبك.'
                : 'إذا كنت تعتقد أن هذا الحظر كان ناتجاً عن خطأ، يرجى تقديم تظلم عبر القنوات الرسمية فور توفرها.'
              }
            </p>
            
            <div className={`pt-4 grid grid-cols-1 ${showSupport ? 'sm:grid-cols-2' : ''} gap-4`}>
              <button 
                onClick={handleLogout}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </button>
              
              {showSupport && (
                <>
                  <a 
                    href="https://wa.me/966500000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-xl shadow-green-100"
                  >
                    <MessageCircle className="w-4 h-4" />
                    تواصل عبر واتساب
                  </a>

                  <a 
                    href="tel:+966500000000"
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                  >
                    <Phone className="w-4 h-4" />
                    اتصال هاتفي
                  </a>

                  <a 
                    href="mailto:support@arbon.sa"
                    className="w-full bg-white text-gray-400 border-2 border-gray-50 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
                  >
                    المراسلة الرسمية
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MainLayout({ children, isAdmin }: { children: React.ReactNode, isAdmin: boolean }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute && isAdmin) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  // If user is admin, we might want to hide regular user elements even on non-admin routes
  // or redirect them to admin dashboard if they hit user pages
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 md:pb-8">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
      <Footer />
      {!isAdmin && (
        <>
          <BottomNav />
          <InstallPWAHint />
          <ProductTour />
          <SupportButton />
        </>
      )}
    </>
  );
}

export default function App() {
  const { user, profile, loading, error, pending2FA, clearError } = useAuth();
  const isAdmin = user?.email === 'khyratfarmdates@gmail.com' || profile?.isAdmin;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="w-16 h-16 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-100" />
          <div className="space-y-2">
            <h3 className="text-xl font-black text-gray-900">جاري تحميل منصة عربون...</h3>
            <p className="text-gray-400 font-medium">نتحقق من أمان اتصالك وجلسة العمل</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 text-blue-600 font-bold hover:underline text-sm"
          >
            إذا استغرق التحميل وقتاً طويلاً، اضغط هنا للتحديث
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <FloatingScrollToTop />
      <ErrorBoundary>
        <NotificationProvider>
          <Toaster position="top-center" richColors />
          <div className="min-h-screen bg-[#f8fafc] font-sans antialiased rtl relative" dir="rtl">
            {profile?.isBlocked && !isAdmin && (
              <BlockedUserOverlay 
                reason={profile.blockReason} 
                showSupport={profile.showSupportOnBlock !== false} 
              />
            )}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
                >
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
                    <span className="text-sm font-medium">{error}</span>
                    <button 
                      onClick={clearError}
                      className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* 2FA Global Overlay */}
            <AnimatePresence>
              {pending2FA && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-md"
                  >
                    <PhoneVerification 
                      mode="2fa"
                      onSuccess={() => {
                        // Pending state is handled inside verify2FA in useAuth
                      }}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <MainLayout isAdmin={!!isAdmin}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={isAdmin ? <Navigate to="/admin" /> : <SearchPage />} />
                  <Route
                    path="/dashboard"
                    element={user ? (isAdmin ? <Navigate to="/admin" /> : <Dashboard />) : <Navigate to="/" />}
                  />
                  
                  {/* Admin Protected Routes with professional layout */}
                  {isAdmin && (
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AdminOverview />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="finance" element={<AdminFinance />} />
                      <Route path="transactions" element={<AdminTransactions />} />
                      <Route path="revenue" element={<AdminRevenue />} />
                      <Route path="settlements" element={<AdminSettlements />} />
                      <Route path="disputes" element={<AdminDisputes />} />
                      <Route path="support" element={<AdminSupport />} />
                      <Route path="logs" element={<SystemLogsPage />} />
                      <Route path="settings" element={<AdminSettings />} />
                    </Route>
                  )}

                  <Route
                    path="/order/:id"
                    element={<OrderDetailsPage />}
                  />
                  <Route
                    path="/seller/:sellerId"
                    element={<SellerProfilePage />}
                  />
                  <Route
                    path="/settings"
                    element={user ? (isAdmin ? <Navigate to="/admin" /> : <SettingsPage />) : <Navigate to="/" />}
                  />
                  <Route
                    path="/profile"
                    element={user ? (isAdmin ? <Navigate to="/admin" /> : <UserProfilePage />) : <Navigate to="/" />}
                  />
                  <Route
                    path="/create-order"
                    element={user ? (isAdmin ? <Navigate to="/admin" /> : <CreateOrderPage />) : <Navigate to="/" />}
                  />
                  <Route path="/help-center" element={<HelpCenterPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/how-it-works" element={<HowItWorksPage />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </MainLayout>
          </div>
        </NotificationProvider>
      </ErrorBoundary>
    </Router>
  );
}
