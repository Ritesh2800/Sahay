import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WifiOff, Wifi, CloudUpload, CloudCheck, DatabaseBackup } from "lucide-react";
import { waitForPendingWrites } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [pendingWrites, setPendingWrites] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setPendingWrites(true);
    }
  }, [isOnline]);

  useEffect(() => {
    let timeoutId: any;
    
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      setPendingWrites(true);
      
      // Wait for any pending offline writes to sync, plus a minimum visual delay of 1.5s
      Promise.all([
        waitForPendingWrites(db).catch((err) => {
          console.error('Error waiting for pending writes:', err);
        }),
        new Promise(resolve => setTimeout(resolve, 1500))
      ]).then(() => {
        setIsSyncing(false);
        setPendingWrites(false);
        setShowSyncSuccess(true);
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => setShowSyncSuccess(false), 3000);
      });
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] pointer-events-none flex flex-col items-center gap-2">
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            key="offline"
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 px-5 py-3 bg-orange-500/10 backdrop-blur-xl border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-500/10"
          >
            <div className="relative">
              <WifiOff className="w-5 h-5 text-orange-400" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-orange-400 uppercase tracking-widest italic leading-tight">Offline Mode</span>
              <span className="text-[9px] font-bold text-orange-400/80 uppercase tracking-wider leading-tight">Changes saved locally (Pending Sync)</span>
            </div>
          </motion.div>
        )}

        {isOnline && isSyncing && (
          <motion.div
            key="syncing"
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 px-5 py-3 bg-blue-500/10 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-500/10"
          >
            <DatabaseBackup className="w-5 h-5 text-blue-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xs font-black text-blue-400 uppercase tracking-widest italic leading-tight">Syncing Data</span>
              <span className="text-[9px] font-bold text-blue-400/80 uppercase tracking-wider leading-tight">Pushing local changes to cloud...</span>
            </div>
            <CloudUpload className="w-4 h-4 text-blue-400/50 animate-bounce ml-2" />
          </motion.div>
        )}

        {isOnline && !isSyncing && showSyncSuccess && (
          <motion.div
            key="sync-success"
            initial={{ y: -20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 px-5 py-3 bg-green-500/10 backdrop-blur-xl border border-green-500/30 rounded-2xl shadow-2xl shadow-green-500/10"
          >
            <CloudCheck className="w-5 h-5 text-green-400" />
            <div className="flex flex-col">
              <span className="text-xs font-black text-green-400 uppercase tracking-widest italic leading-tight">Sync Complete</span>
              <span className="text-[9px] font-bold text-green-400/80 uppercase tracking-wider leading-tight">All changes securely backed up</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
