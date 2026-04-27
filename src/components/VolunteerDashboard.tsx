import React, { useState, useEffect } from "react";
import { Map as MapIcon, ClipboardList, Package, UserCircle, LogOut, Sun, Moon, Award, CheckCircle, Shield, Clock, Home, X, Building2, Star, CheckCircle2, RefreshCcw, AlertTriangle, TrendingUp, MapPin, ChevronRight, Navigation, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, doc, updateDoc, increment, arrayUnion } from "firebase/firestore";
import { db } from "../lib/firebase";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

import SwarmMap from "./SwarmMap";
import SupplyBridge from "./SupplyBridge";
import TasksList from "./TasksList";
import NotificationDrawer from "./NotificationDrawer";
import { ProfileDrawer } from "./ProfileDrawer";
import Community from "./Community";

enum OperationType {
    LIST = 'list',
    GET = 'get',
    UPDATE = 'update'
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
    const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType,
        path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const CountUp = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        let startTimestamp: number | null = null;
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setCount(Math.floor(progress * value));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }, [value, duration]);
    return <>{count}</>;
};

const HomeView = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
    const { user, userData } = useAuth();
    const { theme } = useTheme();
    const [stats, setStats] = useState({ completed: 0, inProgress: 0 });
    const [activeTasks, setActiveTasks] = useState<any[]>([]);
    const [nearbyTasks, setNearbyTasks] = useState<any[]>([]);
    const [swarmAlert, setSwarmAlert] = useState<any>(null);
    const [filter, setFilter] = useState("All");
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [notification, setNotification] = useState<{ message: string; subtext?: string; type?: 'success' | 'info' } | null>(null);
    const [claimingId, setClaimingId] = useState<string | null>(null);

    useEffect(() => {
        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                pos => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                err => console.error("Location error:", err),
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    useEffect(() => {
        if (!user?.uid) return;

        // Count Stats
        const completedQuery = query(collection(db, "tasks"), where("claimed_by", "==", user.uid), where("status", "==", "completed"));
        const inProgressQuery = query(collection(db, "tasks"), where("volunteers_assigned", "array-contains", user.uid), where("status", "==", "in_progress"));

        const unsubCompleted = onSnapshot(completedQuery, s => setStats(prev => ({ ...prev, completed: s.size })));
        const unsubInProgress = onSnapshot(inProgressQuery, s => setStats(prev => ({ ...prev, inProgress: s.size })));

        // Active Tasks
        const activeTasksQuery = query(
            collection(db, "tasks"),
            where("volunteers_assigned", "array-contains", user.uid),
            where("status", "in", ["open", "in_progress"]),
            limit(3)
        );
        const unsubActive = onSnapshot(activeTasksQuery, s => {
            setActiveTasks(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
        });

        // Nearby Tasks
        const nearbyQuery = query(collection(db, "tasks"), where("status", "==", "open"), limit(20));
        const unsubNearby = onSnapshot(nearbyQuery, s => {
            const tasks = s.docs.map(d => ({ id: d.id, ...d.data() }));
            setNearbyTasks(tasks);
            setLoading(false);
        });

        return () => {
            unsubCompleted();
            unsubInProgress();
            unsubActive();
            unsubNearby();
        };

    }, [user?.uid]);

    useEffect(() => {
        if (!userLocation) return;
        const critical = nearbyTasks.find(t => {
            const dist = calculateDistance(userLocation.lat, userLocation.lng, t.lat, t.lng);
            return t.urgency === 'critical' && dist <= 1.6; // ~1 mile
        });
        setSwarmAlert(critical);
    }, [nearbyTasks, userLocation]);

    const markDone = async (task: any) => {
        try {
            await updateDoc(doc(db, "tasks", task.id), { status: "completed" });
            setNotification({
                message: "Mission Finalized",
                subtext: `GRID SYNCED // AWAITING NEXT TASK`,
                type: 'success'
            });
            setTimeout(() => setNotification(null), 4000);
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, "tasks");
        }
    };

    const claimTask = async (task: any) => {
        if (!user?.uid) return;
        setClaimingId(task.id);
        try {
            await updateDoc(doc(db, "tasks", task.id), {
                volunteers_assigned: arrayUnion(user.uid),
                status: "in_progress"
            });
            setNotification({
                message: "Asset Secured",
                subtext: `DEPLOYMENT ACTIVE // AWAITING FURTHER INSTRUCTIONS`,
                type: 'info'
            });
            setTimeout(() => setNotification(null), 4000);
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, "tasks");
        } finally {
            setTimeout(() => setClaimingId(null), 1000);
        }
    };

    const getEmoji = (cat: string) => {
        switch (cat) {
            case 'Food': return '🍱';
            case 'Medical': return '💊';
            case 'Shelter': return '🏠';
            case 'Rescue': return '🚨';
            default: return '📦';
        }
    };

    const categories = ["All", "Food", "Medical", "Shelter", "Rescue"];

    const sectionVariants = {
        hidden: { opacity: 0, y: 12 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.1, duration: 0.4 }
        })
    };

    return (
        <div className="p-6 pb-32 space-y-10 max-w-2xl mx-auto">
            {/* Greeting */}
            <motion.div custom={0} initial="hidden" animate="visible" variants={sectionVariants}>
                <h2 className="text-2xl font-black text-text-primary tracking-tight mb-1 italic uppercase">Hello, {user?.displayName?.split(' ')[0]} 👋</h2>
                <p className="text-[11px] text-text-secondary font-black uppercase tracking-[0.2em] mb-4 opacity-70 italic">
                    {format(new Date(), "EEEE, d MMMM · h:mm a")}
                </p>
                {userData?.ngo_id && (
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-2xl border border-blue-500/20 shadow-sm backdrop-blur-sm">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">{userData.ngo_name || 'Assigned NGO'}</span>
                    </div>
                )}
            </motion.div>

            {/* View Swarm Map Section */}
            <motion.div custom={1} initial="hidden" animate="visible" variants={sectionVariants}>
                <div
                    onClick={() => onNavigate("map")}
                    className="relative w-full h-32 rounded-[32px] overflow-hidden cursor-pointer group shadow-md border border-border-theme flex items-center justify-center bg-blue-500/5 mb-4 hover:border-blue-500/50 transition-all active:scale-95"
                >
                    {/* Placeholder map-like layout background */}
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPPHBhdGggZD0iTTIwLjUgMjAuNWw1IDUtNSA1LTUtNSAgNSA1em01IDVsNSA1LTUgNS01LTUtNSA1em0tNS01bDUgNS01IDUtNS01IDUgNXptZS01bDUgNS01IDUtNS01IDUgNXptMC0xMGw1IDUtNSA1LTUtNSA1LS01bDUgNS01IDUtNS01IDUgNXptMC01bDUgNS01IDUtNS01LTUgNSIgc3Ryb2tlPSIjMjU2M0ViIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')] pointer-events-none" />

                    <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br ${theme === 'dark' ? 'from-black/80 to-transparent' : 'from-blue-600/90 to-blue-800/90'} backdrop-blur-[2px]`}>
                        <MapPin className={`w-8 h-8 mb-2 group-hover:animate-bounce shadow-sm drop-shadow-lg ${theme === 'dark' ? 'text-blue-500' : 'text-white'}`} />
                        <span className="text-xl font-black uppercase tracking-widest text-white italic drop-shadow-md">View Swarm Map</span>
                        <p className={`text-[10px] uppercase tracking-widest font-black mt-1 ${theme === 'dark' ? 'text-white/70' : 'text-blue-100/90'}`}>Real-time Relief Operations</p>
                    </div>
                </div>
            </motion.div>

            {/* Stats Strip */}
            <motion.div custom={2} initial="hidden" animate="visible" variants={sectionVariants} className="grid grid-cols-2 gap-3">
                {[
                    { label: "Tasks Done", value: stats.completed, icon: CheckCircle2, color: "#1e8e3e" },
                    { label: "In Progress", value: stats.inProgress, icon: RefreshCcw, color: "#1a73e8" }
                ].map((s, i) => (
                    <div key={i} className="bg-surface border border-border-theme p-4 py-6 rounded-[32px] shadow-sm relative group flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 w-10 h-10 bg-surface-lighter rounded-bl-[24px] rounded-tr-[32px] border-l border-b border-border-theme/30 flex items-center justify-center">
                            <s.icon className="w-3 h-3 shadow-sm" style={{ color: s.color }} />
                        </div>
                        <div className="pt-2">
                            <p className="text-2xl font-black text-text-primary tracking-tighter leading-none mb-2 italic">
                                <CountUp value={s.value} duration={600} />
                            </p>
                            <p className="text-[8px] font-black text-text-secondary uppercase tracking-[0.1em] opacity-50 italic leading-tight">{s.label}</p>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Active Tasks */}
            <motion.div custom={3} initial="hidden" animate="visible" variants={sectionVariants} className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-secondary italic opacity-60">Nearby Tasks</h3>
                    <button onClick={() => onNavigate("tasks")} className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline italic">View Tasks</button>
                </div>
                {activeTasks.length > 0 ? (
                    <div className="space-y-3">
                        {activeTasks.map(task => (
                            <motion.div
                                key={task.id}
                                exit={{ x: -100, opacity: 0 }}
                                className="flex items-center gap-4 p-5 bg-surface border border-border-theme rounded-[32px] shadow-sm hover:border-blue-500/20 transition-all group backdrop-blur-sm"
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-border-theme/50 transition-transform group-hover:rotate-6 ${task.category === 'Food' ? 'bg-green-500/10 text-green-600' :
                                        task.category === 'Medical' ? 'bg-red-500/10 text-red-600' :
                                            task.category === 'Shelter' ? 'bg-yellow-500/10 text-yellow-600' :
                                                task.category === 'Rescue' ? 'bg-red-600/10 text-red-700' : 'bg-gray-500/10 text-gray-600'
                                    }`}>
                                    {getEmoji(task.category)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-[13px] text-text-primary uppercase tracking-tight truncate mb-1 italic">{task.title}</h4>
                                    <p className="text-[9px] text-text-secondary font-black uppercase tracking-[0.15em] truncate opacity-50 italic">
                                        {task.ngo_name} // {userLocation ? calculateDistance(userLocation.lat, userLocation.lng, task.lat, task.lng).toFixed(1) : '?'} KM RADIUS
                                    </p>
                                </div>
                                <button
                                    onClick={() => markDone(task)}
                                    className="px-5 py-3 rounded-2xl bg-green-500/5 hover:bg-green-600 text-green-600 hover:text-white border border-green-500/10 transition-all flex items-center gap-2 group/btn active:scale-95 shadow-sm uppercase font-black text-[9px] tracking-widest italic"
                                >
                                    <CheckCircle2 className="w-4 h-4 shadow-sm" />
                                    <span className="hidden group-hover/btn:block">Finalize</span>
                                </button>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="p-16 text-center border-2 border-dashed border-border-theme rounded-[48px] bg-surface-lighter/20 backdrop-blur-[2px]">
                        <div className="w-20 h-20 bg-surface rounded-[24px] flex items-center justify-center mx-auto mb-6 border border-border-theme shadow-xl group hover:rotate-12 transition-transform">
                            <CheckCircle2 className="w-10 h-10 text-green-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-8 italic opacity-40">No Tasks Nearby</p>
                        <button onClick={() => onNavigate("map")} className="text-[11px] bg-blue-600 text-white px-10 py-4 rounded-full font-black uppercase tracking-[0.25em] shadow-2xl shadow-blue-500/30 active:scale-95 transition-all italic hover:bg-blue-500">Scan Area Assets</button>
                    </div>
                )}
            </motion.div>

            {/* Swarm Alert */}
            {swarmAlert && (
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-1 rounded-[32px] bg-red-600 animate-pulse-border relative overflow-hidden group cursor-pointer shadow-2xl shadow-red-600/30"
                    onClick={() => onNavigate("map")}
                >
                    <div className="p-6 bg-red-500 rounded-[28px] flex items-center gap-6 relative z-10 transition-all group-hover:bg-red-400">
                        <div className="w-12 h-12 bg-white/20 rounded-[20px] flex items-center justify-center shadow-2xl border border-white/10">
                            <AlertTriangle className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-1 italic leading-none opacity-80">🔴 CRITICAL_DEPLOYMENT_REQUIRED</p>
                            <h4 className="text-white font-black text-sm uppercase italic truncate tracking-tight">{swarmAlert.title} // {userLocation ? calculateDistance(userLocation.lat, userLocation.lng, swarmAlert.lat, swarmAlert.lng).toFixed(1) : '?'} KM</h4>
                        </div>
                        <div className="bg-white/20 p-2.5 rounded-full shadow-lg group-hover:translate-x-1 transition-transform">
                            <ChevronRight className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @keyframes pulse-red {
                            0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
                            70% { box-shadow: 0 0 0 20px rgba(220, 38, 38, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
                        }
                        .animate-pulse-border { animation: pulse-red 2s infinite; }
                    `}} />
                </motion.div>
            )}

            {/* Nearby Tasks Feed */}
            <motion.div custom={4} initial="hidden" animate="visible" variants={sectionVariants} className="space-y-6">
                <div className="px-1">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-secondary italic mb-6 opacity-60">Proximity Sector Scan</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {categories.map(c => (
                            <button
                                key={c}
                                onClick={() => setFilter(c)}
                                className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all border italic shadow-sm backdrop-blur-sm ${filter === c ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/20' : 'bg-surface border-border-theme text-text-secondary opacity-60'
                                    }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-24 gap-6">
                        <div className="relative w-10 h-10 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border border-border-theme" />
                            <div className="absolute w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/60 italic">Syncing Grid Coordinates...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {nearbyTasks
                            .filter(t => filter === "All" || t.category === filter)
                            .filter(t => !userLocation || calculateDistance(userLocation.lat, userLocation.lng, t.lat, t.lng) <= 5)
                            .map(task => (
                                <motion.div
                                    key={task.id}
                                    animate={claimingId === task.id ? { scale: [1, 1.02, 1], rotate: [0, 1, -1, 0] } : {}}
                                    transition={{ duration: 0.4 }}
                                    className={`p-7 bg-surface border border-border-theme rounded-[40px] shadow-sm hover:border-blue-500/20 hover:shadow-xl hover:shadow-blue-500/5 transition-all group backdrop-blur-sm bg-opacity-70 ${claimingId === task.id ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-2xl shadow-blue-500/20' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-5">
                                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.3em] border shadow-sm italic ${task.category === 'Food' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                                task.category === 'Medical' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                    'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                            }`}>
                                            {task.category}
                                        </span>
                                        {task.urgency === 'critical' && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-red-500/20 italic shadow-sm">PRIORITY_V1</span>
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="text-lg font-black text-text-primary uppercase tracking-tight mb-3 italic group-hover:text-blue-600 transition-colors">{task.title}</h4>
                                    <p className="text-[13px] text-text-secondary leading-relaxed mb-8 line-clamp-2 opacity-80 font-medium italic">{task.description}</p>

                                    <div className="grid grid-cols-2 gap-4 mb-8 py-5 border-y border-border-theme/50 px-2">
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-4 h-4 text-blue-500 opacity-60" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-text-secondary uppercase tracking-tighter truncate italic opacity-80">{task.location_name || 'Relative Point'}</span>
                                                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic flex items-center gap-1">
                                                    <Navigation className="w-2 h-2" />
                                                    {userLocation ? `${calculateDistance(userLocation.lat, userLocation.lng, task.lat, task.lng).toFixed(2)} KM` : 'Locating...'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <UserCircle className="w-4 h-4 text-text-secondary opacity-40" />
                                            <span className="text-[10px] font-black text-text-secondary uppercase tracking-tighter italic opacity-70">{(task.volunteers_assigned?.length || 0)}/{(task.volunteers_needed || 1)} SYNCED</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => claimTask(task)}
                                        disabled={task.volunteers_assigned?.includes(user!.uid) || claimingId === task.id}
                                        className={`w-full py-4.5 rounded-[24px] font-black uppercase text-[11px] tracking-[0.3em] transition-all flex items-center justify-center gap-4 italic shadow-lg ${task.volunteers_assigned?.includes(user!.uid)
                                                ? 'bg-green-500/10 text-green-600 border border-green-500/20 cursor-not-allowed shadow-none'
                                                : claimingId === task.id
                                                    ? 'bg-blue-400 text-white cursor-wait animate-pulse'
                                                    : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98]'
                                            }`}
                                    >
                                        {claimingId === task.id ? (
                                            <><RefreshCcw className="w-4 h-4 animate-spin" /> Transmitting...</>
                                        ) : task.volunteers_assigned?.includes(user!.uid) ? (
                                            <><CheckCircle2 className="w-4 h-4 shadow-sm" /> Asset Claimed</>
                                        ) : (
                                            <><Navigation className="w-4 h-4 shadow-sm" /> Initialize Claim</>
                                        )}
                                    </button>
                                </motion.div>
                            ))}
                    </div>
                )}
            </motion.div>

            {/* Supplies Section */}
            <motion.div custom={4} initial="hidden" animate="visible" variants={sectionVariants} className="bg-surface rounded-[48px] border border-border-theme overflow-hidden min-h-[600px] mb-8">
                <SupplyBridge />
            </motion.div>

            {/* NGO Card */}
            {userData?.ngo_id && (
                <motion.div custom={5} initial="hidden" animate="visible" variants={sectionVariants} className="p-10 bg-[#1a73e8] rounded-[48px] text-white shadow-2xl shadow-blue-700/40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 -mr-32 -mt-32 rounded-full blur-[80px] opacity-40 group-hover:scale-125 transition-transform duration-1000" />
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-tight mb-2">{userData.ngo_name}</h3>
                                <div className="flex gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white/20 px-4 py-1.5 rounded-full italic backdrop-blur-sm border border-white/10">Primary NGO</span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-black/20 px-4 py-1.5 rounded-full italic border border-black/10 opacity-60">ADMIN_V-CERT_ACTIVE</span>
                                </div>
                            </div>
                            <div className="w-16 h-16 bg-white/10 rounded-[20px] flex items-center justify-center border border-white/20 shadow-2xl backdrop-blur-sm">
                                <Award className="w-9 h-9 text-white opacity-80" />
                            </div>
                        </div>
                        <p className="text-[13px] font-medium leading-relaxed mb-10 opacity-70 line-clamp-3 italic tracking-tight">Authoritative humanitarian logistics hub overseeing regional deployment streams and medical surge capacity. Efficiency optimized for rapid grid intervention.</p>

                        <div className="space-y-5 mb-10">
                            <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.3em] italic opacity-90">
                                <span>Collaborative Impact</span>
                                <span>1K CR MILESTONE</span>
                            </div>
                            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/5 p-0.5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '38%' }}
                                    className="h-full bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                                />
                            </div>
                        </div>

                        <button onClick={() => onNavigate("map")} className="w-full py-5 bg-white text-blue-600 rounded-[24px] font-black uppercase text-[12px] tracking-[0.4em] shadow-2xl hover:bg-opacity-95 active:scale-[0.98] transition-all italic">Locate Hub Target</button>
                    </div>
                </motion.div>
            )}

            {/* Notification Overlay */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, x: "-50%", scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                        exit={{ opacity: 0, y: 50, x: "-50%", scale: 0.9 }}
                        className="fixed bottom-24 left-1/2 z-[2000] w-[min(400px,90%)]"
                    >
                        <div className={`p-4 rounded-[24px] shadow-2xl border backdrop-blur-xl flex items-center gap-4 ${notification.type === 'success'
                                ? 'bg-green-600 text-white border-green-500 shadow-green-900/40'
                                : 'bg-blue-600 text-white border-blue-500 shadow-blue-900/40'
                            }`}>
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                                {notification.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black uppercase text-[10px] tracking-[0.2em] mb-0.5 italic">{notification.message}</h4>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-70 italic truncate">{notification.subtext}</p>
                            </div>
                            <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function VolunteerDashboard() {
    const [activeTab, setActiveTab] = useState("home");
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const tabs = [
        { id: "home", label: "Home", icon: Home },
        { id: "map", label: "Map", icon: MapIcon },
        { id: "tasks", label: "Tasks", icon: ClipboardList },
        { id: "community", label: "Community", icon: MessageSquare },
    ];

    return (
        <div className="h-screen flex flex-col bg-background-dark overflow-hidden text-text-primary">
            {/* Header Pill */}
            <header className="fixed top-4 left-1/2 -translate-x-1/2 h-16 w-[95%] max-w-7xl px-6 flex items-center justify-between z-[1050] bg-surface/75 backdrop-blur-xl border border-border-theme rounded-[32px] aura-ring transition-all">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Sahay Logo" className="w-[42px] h-[42px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <h1 className="text-base font-black text-blue-500 uppercase tracking-tighter italic">Sahay</h1>
                </div>
                <div className="flex items-center gap-4">
                    <NotificationDrawer />
                    <button
                        onClick={toggleTheme}
                        className="p-1.5 rounded-full bg-surface-lighter text-text-secondary hover:text-blue-500 transition-all border border-border-theme shadow-sm active:scale-95"
                    >
                        {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="w-10 h-10 rounded-2xl border border-border-theme overflow-hidden shadow-xl active:scale-90 transition-all focus:ring-2 focus:ring-blue-500 ring-offset-2 ring-offset-surface bg-blue-600 flex items-center justify-center p-0.5"
                    >
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-full h-full object-cover rounded-[14px]" onError={(e) => {
                                (e.target as any).style.display = 'none';
                                (e.target as any).parentElement.innerHTML = user.displayName?.charAt(0) || 'U';
                            }} />
                        ) : (
                            <span className="text-white text-sm font-black italic">{user?.displayName?.charAt(0) || user?.email?.charAt(0)}</span>
                        )}
                    </button>
                </div>
            </header>

            {/* Profile Drawer */}
            <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: activeTab === "map" ? 0 : 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: activeTab === "map" ? 0 : -10 }}
                        className={`h-full w-full ${activeTab === "map" ? "" : "overflow-y-auto pt-20 pb-24"}`}
                    >
                        {activeTab === "home" && <HomeView onNavigate={setActiveTab} />}
                        {activeTab === "map" && <SwarmMap />}
                        {activeTab === "tasks" && <TasksList />}
                        {activeTab === "community" && <Community />}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Bottom Nav Pill */}
            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 px-2 py-2 flex items-center gap-1 bg-surface/75 backdrop-blur-2xl border border-border-theme rounded-[40px] aura-ring z-[1050] w-[min(520px,94%)] h-16 transition-all">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex flex-col items-center justify-center flex-1 h-full rounded-[30px] transition-all duration-300 ${activeTab === tab.id ? 'text-blue-600 translate-y-[-2px]' : 'text-text-secondary'
                            }`}
                    >
                        <div className={`transition-all duration-300 relative z-10 ${activeTab === tab.id ? 'scale-110 drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]' : ''}`}>
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                        </div>
                        <span className={`text-[8px] transition-all duration-300 uppercase font-black tracking-widest relative z-10 ${activeTab === tab.id ? 'opacity-100 mt-0.5 italic' : 'opacity-40'}`}>
                            {tab.label}
                        </span>
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activePill"
                                className="absolute inset-0 bg-blue-500/10 shadow-[0_4px_16px_rgba(59,130,246,0.15)] rounded-[32px] z-0"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                ))}
            </nav>
        </div>
    );
}
