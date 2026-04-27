import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, requestFCMToken, onMessageListener } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Check, X, AlertTriangle, Truck, ArrowRightLeft } from "lucide-react";
import toast from "react-hot-toast"; // If it is not installed, I will install it or I will write my own toaster fallback.

export default function NotificationDrawer() {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userData) return;

    // Ask for FCM Token and save it to user profile (Simulating connection)
    const initFCM = async () => {
      const token = await requestFCMToken();
      if (token) {
        await updateDoc(doc(db, "users", userData.uid), { fcmToken: token });
      }
    };
    initFCM();

    // Listen to Firebase background messages coming to foreground
    const listenForMessages = async () => {
      onMessageListener().then((payload: any) => {
        // Here we could trigger a toast, but our Firestore listener will pick it up if it was written to firestore anyway.
        // Re-call listener for next message 
        listenForMessages();
      }).catch(err => console.log('failed: ', err));
    };
    listenForMessages();

    // The preferred in-app method: Firestore Real-time fallback
    const targetId = userData.role === 'ngo_admin' ? userData.ngo_id : userData.uid;
    if (!targetId) return;

    const q = query(
      collection(db, "notifications"),
      where("target_id", "in", userData.role === 'volunteer' ? [targetId, "all_volunteers"] : [targetId])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      notifs.sort((a,b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [userData]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch(e) {
      console.error("Error marking read", e);
    }
  };

  const getIcon = (type: string) => {
    if (type === 'trade') return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
    if (type === 'emergency') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (type === 'dispatch') return <Truck className="w-4 h-4 text-orange-500" />;
    return <Bell className="w-4 h-4 text-purple-500" />;
  };

  return (
    <div className="relative z-[100]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-surface border border-border-theme hover:bg-surface-lighter rounded-2xl transition-all shadow-sm group"
      >
        <Bell className="w-5 h-5 text-text-primary group-hover:rotate-12 transition-all" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] sm:absolute sm:top-full sm:right-0 sm:left-auto sm:translate-x-0 sm:w-[320px] mt-0 sm:mt-4 z-[2000] bg-surface/90 backdrop-blur-xl border border-border-theme rounded-[32px] shadow-2xl overflow-hidden aura-ring max-h-[70vh] flex flex-col"
            >
              <div className="p-4 border-b border-border-theme flex justify-between items-center bg-surface-lighter/50">
                <h3 className="font-black text-xs uppercase tracking-widest text-text-primary flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5" /> Comm Link
                </h3>
                {unreadCount > 0 && (
                  <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md">{unreadCount} UNREAD</span>
                )}
              </div>
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary/50 flex flex-col items-center">
                    <Bell className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Alerts</p>
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-border-theme">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => { if(!notif.read) markAsRead(notif.id) }}
                        className={`p-4 hover:bg-surface-lighter cursor-pointer transition-colors relative ${!notif.read ? 'bg-blue-500/5' : ''}`}
                      >
                        {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
                        <div className="flex gap-3 items-start">
                          <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${notif.type === 'emergency' ? 'bg-red-500/10' : notif.type === 'trade' ? 'bg-blue-500/10' : 'bg-orange-500/10'}`}>
                            {getIcon(notif.type)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-text-primary mb-1">{notif.title}</p>
                            <p className="text-[10px] text-text-secondary/80 leading-relaxed font-medium">{notif.body}</p>
                            <p className="text-[8px] text-text-secondary mt-2 font-black uppercase tracking-widest">{notif.created_at ? new Date(notif.created_at.toDate()).toLocaleTimeString() : 'Just now'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
