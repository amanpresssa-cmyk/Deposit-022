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
import { AdminDashboard } from './pages/AdminDashboard';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { SupportButton } from './components/ui/SupportButton';
import { BottomNav } from './components/layout/BottomNav';
import { InstallPWAHint } from './components/layout/InstallPWAHint';
import { ProductTour } from './components/layout/ProductTour';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X } from 'lucide-react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';

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

export default function App() {
  const { user, loading, error, clearError } = useAuth();

  // Test connection as required by integration instructions
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-bold animate-pulse">جاري تحميل منصة عربون...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
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
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 md:pb-8">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<SearchPage />} />
              <Route
                path="/dashboard"
                element={user ? <Dashboard /> : <Navigate to="/" />}
              />
              <Route
                path="/order/:id"
                element={user ? <OrderDetailsPage /> : <Navigate to="/" />}
              />
              <Route
                path="/seller/:sellerId"
                element={<SellerProfilePage />}
              />
              <Route
                path="/admin"
                element={<AdminDashboard />}
              />
              <Route
                path="/settings"
                element={user ? <SettingsPage /> : <Navigate to="/" />}
              />
              <Route
                path="/create-order"
                element={user ? <CreateOrderPage /> : <Navigate to="/" />}
              />
            </Routes>
          </AnimatePresence>
        </main>
        <Footer />
        <BottomNav />
        <InstallPWAHint />
        <ProductTour />
        <SupportButton />
      </div>
      </ErrorBoundary>
    </Router>
  );
}
