import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { LayoutDashboard, Camera, PlusCircle, ListTodo, Package, Users, Sun, Moon, Map as MapIcon, LogOut, CheckCircle, Trash2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot as onSnapshotFirestore, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import OCRScanner from "./OCRScanner";
import SupplyBridge from "./SupplyBridge";
import NotificationDrawer from "./NotificationDrawer";
import SwarmMap from "./SwarmMap";
import { ProfileDrawer } from "./ProfileDrawer";
import Community from "./Community";

// Refined components
const Overview = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
    const { userData } = useAuth();
    const [stats, setStats] = useState({ tasks: 0, volunteers: 0, supplies: 0, impact: 0 });

    useEffect(() => {
        if (!userData?.ngo_id) return;
        
        const qTasks = query(collection(db, "tasks"), where("ngo_id", "==", userData.ngo_id));
        const unsubscribeTasks = onSnapshotFirestore(qTasks, (snapshot) => {
            setStats(prev => ({ ...prev, tasks: snapshot.size }));
        });

        const qSupplies = query(collection(db, "supplies"), where("owner_ngo_id", "==", userData.ngo_id));
        const unsubscribeSupplies = onSnapshotFirestore(qSupplies, (snapshot) => {
            setStats(prev => ({ ...prev, supplies: snapshot.size }));
        });

        const qUsers = query(collection(db, "users"), where("ngo_id", "==", userData.ngo_id));
        const unsubscribeUsers = onSnapshotFirestore(qUsers, (snapshot) => {
            setStats(prev => ({ ...prev, volunteers: snapshot.size }));
        });

        return () => {
            unsubscribeTasks();
            unsubscribeSupplies();
            unsubscribeUsers();
        };
    }, [userData?.ngo_id]);

    return (
        <div className="p-6 space-y-8 pb-12">
            <header>
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-text-primary">NGO <span className="text-blue-500">Dashboard</span></h2>
                <p className="text-[10px] text-text-secondary uppercase tracking-[0.4em] font-bold">{userData?.name.replace(" Admin", "") || "GLOBAL RESPONSE"}</p>
            </header>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[ 
                { label: "Missions", value: stats.tasks, color: "text-blue-500", icon: ListTodo, bg: "bg-blue-500/5", border: "border-blue-500/10" },
                { label: "Inventory", value: stats.supplies, color: "text-orange-500", icon: Package, bg: "bg-orange-500/5", border: "border-orange-500/10" },
                { label: "Deployed Team", value: stats.volunteers, color: "text-green-600", icon: Users, bg: "bg-green-500/5", border: "border-green-500/10" }
            ].map((stat, i) => (
                <div key={i} className={`material-card p-5 relative overflow-hidden group border ${stat.border} ${stat.bg} aura-ring-subtle`}>
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <stat.icon className="w-8 h-8 text-text-primary" />
                    </div>
                    <p className="text-[10px] font-black text-text-secondary uppercase mb-1 tracking-widest">{stat.label}</p>
                    <p className={`text-2xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
                </div>
            ))}
            </div>

            {/* Community Banner */}
            <div className="mb-8">
                <div 
                    onClick={() => onNavigate("community")}
                    className="relative w-full h-32 rounded-[32px] overflow-hidden cursor-pointer group shadow-md border border-border-theme flex items-center justify-center bg-[#ea4335]/5 hover:border-[#ea4335]/50 transition-all active:scale-95"
                >
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPPHBhdGggZD0iTTIwLjUgMjAuNWw1IDUtNSA1LTUtNSAgNSA1em01IDVsNSA1LTUgNS01LTUtNSA1em0tNS01bDUgNS01IDUtNS01IDUgNXptZS01bDUgNS01IDUtNS01IDUgNXptMC0xMGw1IDUtNSA1LTUtNSA1LS01bDUgNS01IDUtNS01IDUgNXptMC01bDUgNS01IDUtNS01LTUgNSIgc3Ryb2tlPSIjZWE0MzM1IiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')] pointer-events-none" />
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-tr from-black/60 to-transparent">
                        <MessageSquare className="w-8 h-8 text-[#ea4335] mb-2 group-hover:scale-110 transition-transform shadow-sm drop-shadow-lg" />
                        <span className="text-xl font-black uppercase tracking-widest text-white italic drop-shadow-md">Go to Community</span>
                        <p className="text-[10px] text-white/70 uppercase tracking-widest font-black mt-1">Inter-Organizational Intel Hub</p>
                    </div>
                </div>
            </div>

            {/* Command Actions */}
            <div className="space-y-4 mb-4">
                <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em]">Operational Tools</h3>
                <div className="grid grid-cols-1 gap-4">
                    <button 
                        onClick={() => onNavigate("scan")}
                        className="material-card p-6 flex items-center gap-6 text-left hover:border-blue-500/50 transition-all group active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-600 transition-all">
                            <Camera className="w-6 h-6 text-blue-500 group-hover:text-white" />
                        </div>
                        <div>
                            <h4 className="font-black text-text-primary uppercase italic tracking-tight">Field Scanner</h4>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Digitize Paper Reports with Gemini AI</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => onNavigate("tasks")}
                        className="material-card p-6 flex items-center gap-6 text-left hover:border-blue-500/50 transition-all group active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 bg-surface-lighter rounded-2xl flex items-center justify-center border border-border-theme group-hover:bg-blue-600 transition-all">
                            <ListTodo className="w-6 h-6 text-text-secondary group-hover:text-white" />
                        </div>
                        <div>
                            <h4 className="font-black text-text-primary uppercase italic tracking-tight">Mission Log</h4>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Manage Active Disaster Responses</p>
                        </div>
                    </button>
                    
                    <button 
                        onClick={() => onNavigate("post")}
                        className="material-card p-6 flex items-center gap-6 text-left hover:border-orange-500/50 transition-all group active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 group-hover:bg-orange-600 transition-all">
                            <PlusCircle className="w-6 h-6 text-orange-500 group-hover:text-white" />
                        </div>
                        <div>
                            <h4 className="font-black text-text-primary uppercase italic tracking-tight">New Broadcast</h4>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Alert Network to Urgent Needs</p>
                        </div>
                    </button>
                    <button 
                        onClick={() => onNavigate("requests")}
                        className="material-card p-6 flex items-center gap-6 text-left hover:border-green-500/50 transition-all group active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 group-hover:bg-green-600 transition-all">
                            <Users className="w-6 h-6 text-green-500 group-hover:text-white" />
                        </div>
                        <div>
                            <h4 className="font-black text-text-primary uppercase italic tracking-tight">Join Requests</h4>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">Manage Volunteer Applications</p>
                        </div>
                    </button>
                    <button 
                        onClick={() => onNavigate("team")}
                        className="material-card p-6 flex items-center gap-6 text-left hover:border-purple-500/50 transition-all group active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-600 transition-all">
                            <Users className="w-6 h-6 text-purple-500 group-hover:text-white" />
                        </div>
                        <div>
                            <h4 className="font-black text-text-primary uppercase italic tracking-tight">Volunteer Team</h4>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">View Volunteer Profiles & Skills</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

const TeamDirectory = () => {
    const { userData } = useAuth();
    const [team, setTeam] = useState<any[]>([]);

    useEffect(() => {
        if (!userData?.ngo_id) return;
        const q = query(collection(db, "users"), where("ngo_id", "==", userData.ngo_id));
        const unsubscribe = onSnapshotFirestore(q, (snapshot) => {
            const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const uniqueUsers = [];
            const seen = new Set();
            for (const u of allUsers) {
                const identifier = u.email || u.name;
                if (!seen.has(identifier)) {
                    seen.add(identifier);
                    uniqueUsers.push(u);
                }
            }
            setTeam(uniqueUsers);
        });
        return unsubscribe;
    }, [userData?.ngo_id]);

    return (
        <div className="p-6 text-text-primary h-full overflow-y-auto pb-40">
            <h2 className="text-xl font-bold mb-6 italic tracking-tight uppercase">Volunteer <span className="text-purple-500">Team</span></h2>
            <div className="space-y-4">
                {team.length === 0 && <p className="text-center py-12 text-text-secondary italic text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-border-theme rounded-3xl">No team members assigned.</p>}
                {team.map(member => (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} key={member.id} className="material-card p-5 group relative">
                        <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[24px]"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="font-black text-sm text-text-primary mb-1 italic tracking-tight uppercase">{member.name || member.email}</h4>
                                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{member.role || 'Volunteer'}</p>
                                </div>
                            </div>
                            
                            {(member.skills || member.certifications) ? (
                                <div className="space-y-3 bg-surface-lighter p-3 rounded-2xl border border-border-theme">
                                    {member.skills && (
                                        <div>
                                            <p className="text-[9px] uppercase tracking-widest font-bold text-text-secondary mb-1 opacity-70">Skills</p>
                                            <div className="flex flex-wrap gap-1 md:gap-2">
                                                {(Array.isArray(member.skills) ? member.skills : (typeof member.skills === 'string' ? member.skills.split(',') : [])).map((skill: string, i: number) => (
                                                    <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] rounded-md font-bold truncate">
                                                        {skill.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {member.certifications && (
                                        <div>
                                            <p className="text-[9px] uppercase tracking-widest font-bold text-text-secondary mb-1 opacity-70 mt-2">Certifications</p>
                                            <div className="space-y-1">
                                                {(Array.isArray(member.certifications) ? member.certifications : typeof member.certifications === 'string' ? member.certifications.split(',') : []).map((cert: any, i: number) => (
                                                    <div key={i} className="flex flex-col">
                                                        <p className="text-xs font-bold text-text-primary capitalize">
                                                            {typeof cert === 'string' ? cert.trim() : cert.name}
                                                        </p>
                                                        {typeof cert === 'object' && cert.credential_id && (
                                                            <p className="text-[9px] text-text-secondary font-black tracking-widest uppercase">ID: {cert.credential_id}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-50 italic">No supplemental skills provided.</p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const JoinRequests = () => {
    const { userData } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);

    useEffect(() => {
        if (!userData?.ngo_id) return;
        const q = query(collection(db, "join_requests"), where("ngo_id", "==", userData.ngo_id), where("status", "==", "pending"));
        const unsubscribe = onSnapshotFirestore(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("Firestore error in JoinRequests:", error);
        });
        return unsubscribe;
    }, [userData?.ngo_id]);

    const handleAccept = async (requestId: string, userId: string) => {
        if (!userData?.ngo_id || !userData?.name) return;
        try {
            await updateDoc(doc(db, "join_requests", requestId), {
                status: "approved"
            });
            await updateDoc(doc(db, "users", userId), {
                ngo_id: userData.ngo_id,
                ngo_name: userData.name.replace(" Admin", ""),
                role: "volunteer"
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleReject = async (requestId: string) => {
        try {
            await updateDoc(doc(db, "join_requests", requestId), {
                status: "rejected"
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-6 text-text-primary h-full overflow-y-auto pb-40">
            <h2 className="text-xl font-bold mb-6 italic tracking-tight uppercase">Join <span className="text-blue-500">Requests</span></h2>
            <div className="space-y-4">
                {requests.length === 0 && <p className="text-center py-12 text-text-secondary italic text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-border-theme rounded-3xl">No pending requests.</p>}
                {requests.map(req => (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} key={req.id} className="material-card p-4 flex justify-between items-center group relative">
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[24px]"></div>
                        <div className="relative z-10 flex-1">
                            <h4 className="font-black text-sm text-text-primary mb-1 italic tracking-tight uppercase">{req.user_name}</h4>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{req.created_at?.toDate ? new Date(req.created_at.toDate()).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="flex gap-2 relative z-10">
                            <button onClick={() => handleAccept(req.id, req.user_id)} className="px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest">Accept</button>
                            <button onClick={() => handleReject(req.id)} className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest">Reject</button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const PostNeed = ({ onComplete }: { onComplete: () => void }) => {
    const { userData } = useAuth();
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("Food");
    const [urgency, setUrgency] = useState("medium");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, "tasks"), {
                title,
                category,
                urgency,
                description,
                status: "open",
                lat: 18.5204 + (Math.random() - 0.5) * 0.05,
                lng: 73.8567 + (Math.random() - 0.5) * 0.05,
                ngo_id: userData?.ngo_id || "unknown",
                ngo_name: userData?.name.replace(" Admin", "") || "Sahay NGO",
                volunteers_assigned: [],
                created_at: serverTimestamp()
            });

            if (urgency === "critical") {
                await addDoc(collection(db, "notifications"), {
                    target_id: "all_volunteers",
                    type: "emergency",
                    title: `URGENT BROADCAST: ${title}`,
                    body: `${description.slice(0, 50)}... at ${userData?.name.replace(" Admin", "") || "Central Hub"}`,
                    created_at: serverTimestamp(),
                    read: false
                });
            }

            alert("Task posted successfully!");
            onComplete();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <h2 className="text-xl font-bold mb-4">Post a Need</h2>
            <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase">Task Title</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full border-b-2 border-white/5 focus:border-blue-500 outline-none py-2 bg-transparent text-text-primary" placeholder="e.g. Water bottles needed" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border-b-2 border-white/5 focus:border-blue-500 outline-none py-2 bg-transparent text-text-primary">
                        {["Food", "Medical", "Shelter", "Rescue", "Other"].map(c => <option key={c} className="bg-background-dark">{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase">Urgency</label>
                    <select value={urgency} onChange={e => setUrgency(e.target.value)} className="w-full border-b-2 border-white/5 focus:border-blue-500 outline-none py-2 bg-transparent text-text-primary">
                        {["low", "medium", "critical"].map(u => <option key={u} className="bg-background-dark">{u}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase">Description</label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} className="w-full border-b-2 border-white/5 focus:border-blue-500 outline-none py-2 resize-none bg-transparent text-text-primary" rows={3} placeholder="Provide more details..." />
            </div>
            <button disabled={loading} type="submit" className="google-btn-primary w-full py-4 mt-6">
                {loading ? "Posting..." : "Post to Grid"}
            </button>
        </form>
    );
};

const OurTasks = () => {
    const { userData } = useAuth();
    const [tasks, setTasks] = useState<any[]>([]);

    useEffect(() => {
        if (!userData?.ngo_id) return;
        const q = query(collection(db, "tasks"), where("ngo_id", "==", userData.ngo_id));
        const unsubscribe = onSnapshotFirestore(q, (snapshot) => {
            setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [userData?.ngo_id]);

    const handleUpdateStatus = async (taskId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, "tasks", taskId), {
                status: newStatus,
                updated_at: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating task:", error);
            alert("Failed to update task status.");
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await deleteDoc(doc(db, "tasks", taskId));
        } catch (error) {
            console.error("Error deleting task:", error);
            alert("Failed to delete task.");
        }
    };

    return (
        <div className="p-6 text-text-primary">
            <h2 className="text-xl font-bold mb-6 italic tracking-tight uppercase">Mission <span className="text-blue-500">Log</span></h2>
            <div className="space-y-4">
                {tasks.length === 0 && <p className="text-center py-12 text-text-secondary italic text-sm border-2 border-dashed border-border-theme rounded-3xl">No active missions recorded for this NGO.</p>}
                {tasks.map(task => (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} key={task.id} className="material-card p-4 flex justify-between items-center group relative cursor-pointer">
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex-1">
                            <h4 className="font-bold text-sm text-text-primary mb-1">{task.title}</h4>
                            <div className="flex gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary bg-surface-lighter px-2 py-0.5 rounded">{task.category}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${task.urgency === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>{task.urgency}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="text-right mr-2">
                                <span className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border border-border-theme uppercase tracking-tighter ${task.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-surface-lighter text-text-secondary'}`}>
                                    {task.status}
                                </span>
                            </div>
                            
                            <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity translate-x-3 md:translate-x-0">
                                {task.status !== 'completed' && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(task.id, 'completed'); }}
                                        className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all"
                                        title="Mark as Completed"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                    title="Delete Broadcast"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const NGOSupplies = () => {
    const { userData } = useAuth();
    const [mySupplies, setMySupplies] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState({ name: "", qty: 0, unit: "units", category: "Food" });

    useEffect(() => {
        if (!userData?.ngo_id) return;
        const q = query(collection(db, "supplies"), where("owner_ngo_id", "==", userData.ngo_id));
        const unsubscribe = onSnapshotFirestore(q, (snapshot) => {
            setMySupplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [userData?.ngo_id]);

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData?.ngo_id) return;
        try {
            await addDoc(collection(db, "supplies"), {
                item_name: newItem.name,
                quantity: Number(newItem.qty),
                unit: newItem.unit,
                category: newItem.category,
                trade_status: "available",
                owner_ngo_id: userData.ngo_id,
                owner_ngo_name: userData.name.replace(" Admin", ""),
                created_at: serverTimestamp()
            });
            setIsAdding(false);
            setNewItem({ name: "", qty: 0, unit: "units", category: "Food" });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteSupply = async (supplyId: string) => {
        try {
            await deleteDoc(doc(db, "supplies", supplyId));
        } catch (error) {
            console.error("Failed to delete supply item:", error);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold uppercase italic tracking-tighter text-text-primary">Available <span className="text-orange-500">Stock</span></h2>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className={`p-2 border border-border-theme rounded-xl transition-all ${isAdding ? 'bg-orange-500 text-white' : 'bg-surface-lighter text-text-secondary hover:bg-orange-500/10 hover:text-orange-500'}`}
                >
                    <PlusCircle className="w-5 h-5" />
                </button>
            </div>

            <AnimatePresence>
                {isAdding && (
                    <motion.form 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handleAddAsset}
                        className="material-card p-6 mb-8 border-orange-500/30 overflow-hidden bg-orange-500/5"
                    >
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Asset Name</label>
                                <input required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-transparent border-b-2 border-border-theme py-2 outline-none focus:border-orange-500 text-text-primary" placeholder="e.g. Rice 10kg" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Quantity</label>
                                    <input type="number" required value={newItem.qty} onChange={e => setNewItem({...newItem, qty: Number(e.target.value)})} className="w-full bg-transparent border-b-2 border-border-theme py-2 outline-none focus:border-orange-500 text-text-primary" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Category</label>
                                    <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full bg-transparent border-b-2 border-border-theme py-2 outline-none focus:border-orange-500 text-text-primary">
                                        {["Food", "Medical", "Clothing", "Equipment"].map(c => <option key={c} className="bg-surface">{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="google-btn-primary w-full py-4 bg-orange-600 hover:bg-orange-500 border-none">Broadcast to Bridge</button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            <div className="space-y-4">
                {mySupplies.map(supply => (
                    <div key={supply.id} className="material-card p-4 border-l-4 border-l-orange-500 bg-surface flex justify-between items-center group relative">
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-sm text-text-primary">{supply.item_name}</h4>
                                <span className="text-[10px] font-mono text-orange-600 font-bold mr-4">{supply.quantity} {supply.unit}</span>
                            </div>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Status: {supply.trade_status}</p>
                        </div>
                        <button 
                            onClick={() => handleDeleteSupply(supply.id)}
                            className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Delete Stock"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
                {mySupplies.length === 0 && !isAdding && (
                    <p className="text-center py-12 text-text-secondary italic text-sm border-2 border-dashed border-border-theme rounded-3xl">This NGO has zero registered assets.</p>
                )}
            </div>
        </div>
    );
};

const Team = () => <div className="p-6 h-full flex items-center justify-center text-text-secondary uppercase text-xs font-bold">Volunteer Management Placeholder</div>;

const NGOProfile = () => {
    const { userData, logout } = useAuth();
    return (
        <div className="p-6 max-w-xl mx-auto space-y-8">
            <div className="text-center">
                <div className="w-24 h-24 bg-blue-600 rounded-[32px] mx-auto mb-4 flex items-center justify-center text-4xl font-bold text-white shadow-2xl">
                    {userData?.name?.charAt(0)}
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-text-primary">{userData?.name.replace(" Admin", "")}</h2>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.4em]">Official Responding NGO</p>
            </div>

            <div className="material-card p-6 space-y-4 bg-surface">
                <div className="flex justify-between items-center pb-4 border-b border-border-theme">
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-tight">NGO ID</span>
                    <span className="text-xs font-mono font-bold text-blue-500">{userData?.ngo_id}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border-theme">
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-tight">Admin Email</span>
                    <span className="text-xs font-bold text-text-primary">{userData?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-tight">Member Since</span>
                    <span className="text-xs font-bold text-text-primary">Apr 2026</span>
                </div>
            </div>

            <button 
                onClick={logout}
                className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-[0.98]"
            >
                Log Out
            </button>
        </div>
    );
};

export default function NGODashboard() {
  const { logout, userData, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("overview");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const tabs = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "map", label: "Sector Map", icon: MapIcon },
    { id: "supplies", label: "Bridge", icon: Package },
    { id: "ngo-supplies", label: "Stock", icon: Package },
  ];

  const renderContent = () => {
    switch (activeTab) {
        case "overview": return <Overview onNavigate={setActiveTab} />;
        case "map": return <SwarmMap />;
        case "scan": return <OCRScanner onComplete={() => setActiveTab("tasks")} />;
        case "post": return <PostNeed onComplete={() => setActiveTab("tasks")} />;
        case "tasks": return <OurTasks />;
        case "requests": return <JoinRequests />;
        case "team": return <TeamDirectory />;
        case "supplies": return <SupplyBridge />;
        case "ngo-supplies": return <NGOSupplies />;
        case "profile": return <NGOProfile />;
        case "community": return <Community />;
        default: return <Overview onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background-dark overflow-hidden text-text-primary">
      <header className="fixed top-4 left-1/2 -translate-x-1/2 h-16 w-[95%] max-w-7xl px-6 flex items-center justify-between z-[1050] bg-surface/70 backdrop-blur-xl border border-border-theme rounded-[32px] aura-ring transition-all">
        <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Sahay Logo" className="w-[42px] h-[42px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <h1 className="text-base font-black text-blue-500 tracking-tight uppercase italic">Sahay</h1>
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
                    }}/>
                ) : (
                    <span className="text-white text-sm font-black italic">{user?.displayName?.charAt(0) || user?.email?.charAt(0)}</span>
                )}
            </button>
        </div>
      </header>

      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
            <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className={`h-full overflow-y-auto ${activeTab === "map" ? "pt-0 pb-0" : "pt-20 pb-24"}`}
            >
                {renderContent()}
            </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav Pill */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 px-2 py-2 flex items-center gap-1 bg-surface/70 backdrop-blur-2xl border border-border-theme rounded-[40px] aura-ring z-[1050] w-[min(560px,95%)] h-16 transition-all">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col items-center justify-center flex-1 h-full rounded-[30px] transition-all duration-300 ${
                activeTab === tab.id ? 'text-blue-600 translate-y-[-2px]' : 'text-text-secondary'
            }`}
          >
            <div className={`transition-all duration-300 relative z-10 ${activeTab === tab.id ? 'scale-110 drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]' : ''}`}>
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
            </div>
            <span className={`text-[7px] transition-all duration-300 uppercase font-bold tracking-tighter whitespace-nowrap relative z-10 ${activeTab === tab.id ? 'opacity-100 mt-0.5' : 'opacity-40'}`}>
                {tab.label}
            </span>
            {activeTab === tab.id && (
                <motion.div 
                    layoutId="activePillNGO"
                    className="absolute inset-0 bg-blue-500/10 shadow-[0_4px_12px_rgba(59,130,246,0.15)] rounded-[30px] z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
