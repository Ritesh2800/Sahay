/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./components/Login";
import Onboarding from "./components/Onboarding";
import NetworkStatus from "./components/NetworkStatus";
import { motion, AnimatePresence } from "motion/react";

const VolunteerDashboard = React.lazy(() => import("./components/VolunteerDashboard"));
const NGODashboard = React.lazy(() => import("./components/NGODashboard"));

function AppContent() {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark gap-6">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-border-theme" />
          <div className="absolute w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Establishing Link</span>
        </div>
      </div>
    );
  }

  const Fallback = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark gap-6">
      <div className="relative w-8 h-8 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-border-theme" />
        <div className="absolute w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary italic">Loading Interface</span>
      </div>
    </div>
  );

  return (
    <>
      <NetworkStatus />
      <AnimatePresence mode="wait">
      {!user ? (
        <Login key="login" />
      ) : !userData?.onboarded ? (
        <Onboarding key="onboarding" />
      ) : (
        <Suspense fallback={<Fallback />}>
          {userData?.role === "volunteer" ? (
            <VolunteerDashboard key="v-dashboard" />
          ) : (
            <NGODashboard key="ngo-dashboard" />
          )}
        </Suspense>
      )}
    </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
