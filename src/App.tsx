import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import { CreateOrderPage } from './pages/CreateOrderPage';
import { SearchPage } from './pages/SearchPage';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { InstallPWAHint } from './components/layout/InstallPWAHint';
import { ProductTour } from './components/layout/ProductTour';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';

export default function App() {
  const { user, loading } = useAuth();

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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#3b82f6] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#f8fafc] font-sans antialiased rtl" dir="rtl">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
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
                path="/create-order"
                element={user ? <CreateOrderPage /> : <Navigate to="/" />}
              />
            </Routes>
          </AnimatePresence>
        </main>
        <BottomNav />
        <InstallPWAHint />
        <ProductTour />
      </div>
    </Router>
  );
}
