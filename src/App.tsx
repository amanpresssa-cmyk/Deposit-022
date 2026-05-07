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
import { AdminSettings } from './pages/admin/AdminSettings';
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
import { Shield, X } from 'lucide-react';
import { FloatingScrollToTop } from './components/ui/FloatingScrollToTop';

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

function MainLayout({ children, isAdmin }: { children: React.ReactNode, isAdmin: boolean }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute && isAdmin) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 md:pb-8">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
      <Footer />
      <BottomNav />
      <InstallPWAHint />
      <ProductTour />
      <SupportButton />
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
                  <Route path="/search" element={<SearchPage />} />
                  <Route
                    path="/dashboard"
                    element={user ? <Dashboard /> : <Navigate to="/" />}
                  />
                  
                  {/* Admin Protected Routes with professional layout */}
                  {isAdmin && (
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<AdminOverview />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="finance" element={<AdminFinance />} />
                      <Route path="disputes" element={<AdminDisputes />} />
                      <Route path="support" element={<AdminSupport />} />
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
                    element={user ? <SettingsPage /> : <Navigate to="/" />}
                  />
                  <Route
                    path="/profile"
                    element={user ? <UserProfilePage /> : <Navigate to="/" />}
                  />
                  <Route
                    path="/create-order"
                    element={user ? <CreateOrderPage /> : <Navigate to="/" />}
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
