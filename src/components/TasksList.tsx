import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, updateDoc, doc, arrayUnion, query, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Navigation, Clock, UserPlus, X, MapPin, AlertCircle, Info, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const CATEGORY_ICONS: any = {
  Food: "🍱",
  Medical: "💊",
  Shelter: "🛏",
  Rescue: "🚁",
  Other: "🔧",
};

export default function TasksList() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [limitCount, setLimitCount] = useState<number>(10);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "tasks"), limit(limitCount));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Sort tasks locally to ensure consistency without relying on complex Firestore indexes
      const newTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
        
      setTasks(newTasks);
      
      if (snapshot.docs.length < limitCount) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    });
    return unsubscribe;
  }, [limitCount]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setLimitCount((prev) => prev + 10);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    return () => observer.disconnect();
  }, [hasMore, loaderRef]);

  const claimTask = async (task: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        volunteers_assigned: arrayUnion(user.uid),
        status: "in_progress"
      });
      // Update local state for modal if open
      if (selectedTask?.id === task.id) {
        setSelectedTask({
          ...task,
          volunteers_assigned: [...(task.volunteers_assigned || []), user.uid]
        });
      }
      alert("Task claimed! Thank you for your help.");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-end mb-2">
        <div>
            <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic">Tasks</h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded uppercase tracking-tighter font-bold">
            {tasks.length} SECURED_ENTRIES
        </span>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12 text-text-secondary italic text-sm border-2 border-dashed border-border-theme rounded-3xl">
          GRID_EMPTY: Awaiting data feeds...
        </div>
      )}

      <div className="space-y-4">
        {tasks.map((task) => (
          <motion.div
            layout
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setSelectedTask(task)}
            className="material-card p-5 border-l-4 border-l-blue-500/40 relative overflow-hidden group cursor-pointer hover:border-l-blue-500 hover:shadow-xl transition-all active:scale-[0.99] bg-surface"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 -mr-12 -mt-12 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-lighter flex items-center justify-center text-xl shadow-inner border border-border-theme">
                    {CATEGORY_ICONS[task.category] || "📍"}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-text-primary tracking-tight">{task.title}</h4>
                  <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest italic">
                      {task.location_name || "SECTOR-12"} • {task.ngo_id?.split('-')[0] || "RELIEF_HQ"}
                  </p>
                </div>
              </div>
              <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest border ${
                  task.urgency === 'critical' ? 'bg-error-theme/10 text-error-theme border-error-theme/20' : 
                  task.urgency === 'medium' ? 'bg-secondary-theme/10 text-secondary-theme border-secondary-theme/20' : 'bg-success-theme/10 text-success-theme border-success-theme/20'
              }`}>
                {task.urgency === 'critical' && <span className="w-1.5 h-1.5 bg-error-theme rounded-full inline-block mr-1.5 animate-pulse shadow-[0_0_8px_var(--error)]"></span>}
                {task.urgency}
              </span>
            </div>

            <p className="text-xs text-text-secondary mb-6 leading-relaxed font-medium line-clamp-2">
              {task.description}
            </p>

            <div className="flex items-center justify-between border-t border-border-theme pt-4 relative z-10">
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-text-secondary uppercase tracking-widest italic">
                      <Clock className="w-3 h-3 text-blue-500" />
                      RECENT
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-text-secondary uppercase tracking-widest italic">
                      <UserPlus className="w-3 h-3 text-blue-500" />
                      {task.volunteers_assigned?.length || 0}/5 DEP
                  </div>
              </div>

              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-blue-500 group-hover:text-blue-600 transition-colors uppercase tracking-widest italic">Enroll</span>
                  {user?.uid && task.volunteers_assigned?.includes(user.uid) && (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                  )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Infinite Scroll Loader */}
      <div 
        ref={loaderRef} 
        className="w-full flex justify-center items-center py-6 h-16"
      >
        {hasMore && tasks.length > 0 && (
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        )}
      </div>

      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-background-dark/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg material-card overflow-hidden shadow-2xl border-border-theme bg-surface"
            >
              {/* Modal Header */}
              <div className="p-6 pb-0 flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl border border-blue-500/20 shadow-inner">
                    {CATEGORY_ICONS[selectedTask.category] || "📍"}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-text-primary uppercase italic tracking-tighter">{selectedTask.title}</h3>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">MISSION_FILE: {selectedTask.id.slice(0,8).toUpperCase()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="p-2 bg-surface-lighter rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface transition-all border border-border-theme shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Visual Separator */}
                <div className="h-px bg-gradient-to-r from-transparent via-border-theme to-transparent"></div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Urgency</p>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                            selectedTask.urgency === 'critical' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                            selectedTask.urgency === 'medium' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 'bg-green-500/10 text-green-600 border-green-500/20'
                        }`}>
                            {selectedTask.urgency}
                        </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Category</p>
                    <p className="text-xs font-bold text-text-primary uppercase tracking-tight">{selectedTask.category}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Deployment Location</p>
                  </div>
                  <div className="bg-surface-lighter p-4 rounded-2xl border border-border-theme shadow-inner">
                    <p className="text-sm text-text-primary font-bold">{selectedTask.location_name || "Unspecified Sector"}</p>
                    <p className="text-[10px] text-text-secondary mt-1 font-mono uppercase tracking-widest">LAT: {selectedTask.lat?.toFixed(4) || "NA"} / LONG: {selectedTask.lng?.toFixed(4) || "NA"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Briefing</p>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed bg-surface-lighter p-4 rounded-2xl border border-border-theme shadow-inner italic">
                    {selectedTask.description}
                  </p>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-blue-500" />
                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Active Personnel</p>
                        </div>
                        <span className="text-[10px] font-mono text-blue-500 font-bold">{selectedTask.volunteers_assigned?.length || 0}/5 LIMIT</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedTask.volunteers_assigned?.length > 0 ? (
                            selectedTask.volunteers_assigned.map((uid: string) => (
                                <span key={uid} className="text-[10px] font-bold px-3 py-1 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-lg shadow-sm">
                                    VOL_{uid.slice(0, 6).toUpperCase()}
                                </span>
                            ))
                        ) : (
                            <p className="text-[10px] text-text-secondary/40 italic uppercase tracking-widest">No personnel deployed yet.</p>
                        )}
                    </div>
                </div>

                <div className="pt-4">
                  {user?.uid && selectedTask.volunteers_assigned?.includes(user.uid) ? (
                    <div className="w-full py-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center gap-3 shadow-green-900/10 shadow-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-black text-green-600 uppercase tracking-widest text-xs italic">Operational Status: ENROLLED</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => claimTask(selectedTask)}
                      disabled={selectedTask.volunteers_assigned?.length >= 5}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-lighter disabled:text-text-secondary text-white font-black uppercase italic tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 active:scale-95"
                    >
                      <Navigation className="w-5 h-5" />
                      Enroll
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
