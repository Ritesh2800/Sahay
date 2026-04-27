import React, { useState, useEffect } from "react";
import { X, Building2, Shield, Star, CheckCircle2, LogOut, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc, collection, query, where, onSnapshot, deleteField, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

const JoinNGO = () => {
    const { user, userData } = useAuth();
    const [ngos, setNgos] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [requestStatus, setRequestStatus] = useState<string | null>(null);

    useEffect(() => {
        // Find existing request
        if (!user?.uid) return;
        const qReq = query(collection(db, "join_requests"), where("user_id", "==", user.uid), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(qReq, (snapshot) => {
            if (!snapshot.empty) setRequestStatus("pending");
            else setRequestStatus(null);
        });

        const fetchNGOs = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "ngos"));
                setNgos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Failed to fetch NGOs", err);
            }
        };
        fetchNGOs();
        
        return unsubscribe;
    }, [user?.uid]);

    const handleJoinRequest = async (ngoId: string, ngoName: string) => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            await addDoc(collection(db, "join_requests"), {
                user_id: user.uid,
                user_name: user.displayName || user.email?.split("@")[0] || "Unknown",
                ngo_id: ngoId,
                ngo_name: ngoName,
                status: "pending",
                created_at: serverTimestamp()
            });
            alert("Join request sent successfully!");
        } catch (err) {
            console.error("Error sending join request", err);
            alert("Failed to send join request");
        } finally {
            setLoading(false);
        }
    };

    if (requestStatus === "pending") {
        return (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-[20px] text-center">
                <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest italic">Pending Join Request</p>
                <p className="text-xs text-text-secondary mt-1">Waiting for NGO approval.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Join an NGO</h3>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                {ngos.map(ngo => (
                    <div key={ngo.id} className="flex justify-between items-center bg-surface-lighter p-3 rounded-xl border border-border-theme hover:border-blue-500/30 transition-all">
                        <div className="truncate pr-4 flex-1">
                            <h4 className="text-sm font-black italic tracking-tight">{ngo.name.replace(" Admin", "")}</h4>
                        </div>
                        <button 
                            disabled={loading}
                            onClick={() => handleJoinRequest(ngo.id, ngo.name)}
                            className="bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Join
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ProfileDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { user, userData, logout } = useAuth();
    const [stats, setStats] = useState({ completed: 0 });
    const [skills, setSkills] = useState<string[]>([]);
    const [certifications, setCertifications] = useState<{name: string, credential_id: string}[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [newSkill, setNewSkill] = useState("");
    const [newCertName, setNewCertName] = useState("");
    const [newCertId, setNewCertId] = useState("");

    useEffect(() => {
        if (userData) {
            setSkills(Array.isArray(userData.skills) ? userData.skills : typeof userData.skills === 'string' && userData.skills ? userData.skills.split(',').map((s: string) => s.trim()) : []);
            setCertifications(Array.isArray(userData.certifications) ? userData.certifications : []);
        }
    }, [userData]);

    const handleLeaveNGO = async () => {
        if (!user?.uid) return;
        try {
            await updateDoc(doc(db, "users", user.uid), {
                ngo_id: deleteField(),
                ngo_name: deleteField(),
                role: deleteField()
            });
            onClose();
        } catch (error) {
            console.error("Error leaving NGO:", error);
            alert("Failed to leave NGO. Please try again.");
        }
    };

    const handleSaveProfile = async (updatedSkills?: string[], updatedCerts?: {name: string, credential_id: string}[]) => {
        if (!user?.uid) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                skills: updatedSkills || skills,
                certifications: updatedCerts || certifications
            });
            // Optional: Give visual feedback instead of alert
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAddSkill = () => {
        if (!newSkill.trim()) return;
        const updated = [...skills, newSkill.trim()];
        setSkills(updated);
        setNewSkill("");
        handleSaveProfile(updated, certifications);
    };

    const handleRemoveSkill = (idx: number) => {
        const updated = skills.filter((_, i) => i !== idx);
        setSkills(updated);
        handleSaveProfile(updated, certifications);
    };

    const handleAddCert = () => {
        if (!newCertName.trim() || !newCertId.trim()) return;
        const updated = [...certifications, { name: newCertName.trim(), credential_id: newCertId.trim() }];
        setCertifications(updated);
        setNewCertName("");
        setNewCertId("");
        handleSaveProfile(skills, updated);
    };

    const handleRemoveCert = (idx: number) => {
        const updated = certifications.filter((_, i) => i !== idx);
        setCertifications(updated);
        handleSaveProfile(skills, updated);
    };

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, "tasks"),
            where("claimed_by", "==", user.uid),
            where("status", "==", "completed")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setStats({ completed: snapshot.size });
        });
        return () => unsubscribe();
    }, [user?.uid]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000]"
                    />
                    <motion.div 
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-[85vw] md:w-[280px] bg-surface shadow-2xl z-[2001] flex flex-col p-6 overflow-y-auto font-sans"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#5f6368] opacity-50 italic">Sector Profile</span>
                            <button onClick={onClose} className="p-2 hover:bg-surface-lighter rounded-full transition-colors active:scale-90">
                                <X className="w-5 h-5 text-text-secondary" />
                            </button>
                        </div>

                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="relative group">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full border-2 border-blue-500/20 mb-4 shadow-lg group-hover:border-blue-500 transition-all focus:ring-4 ring-blue-500/50" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-black mb-4 shadow-lg">
                                        {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <h2 className="text-lg font-black text-text-primary leading-tight mb-1 italic uppercase">{user?.displayName}</h2>
                            <p className="text-[11px] text-text-secondary font-black truncate w-full opacity-60 uppercase tracking-widest">{user?.email}</p>
                        </div>

                        <div className="space-y-6">
                            <div className="h-px bg-border-theme opacity-30" />
                            
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl shadow-sm">
                                    <Building2 className="w-4 h-4 text-blue-500" />
                                    <span className="text-[11px] font-black text-blue-600 uppercase tracking-tight truncate italic">
                                        {userData?.ngo_name || userData?.ngo_id || "Independent Volunteer"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-surface-lighter border border-border-theme rounded-2xl shadow-sm">
                                    <Shield className="w-4 h-4 text-text-secondary opacity-70" />
                                    <span className="text-[11px] font-black text-text-secondary uppercase tracking-tight italic">
                                        {userData?.role || "Volunteer"}
                                    </span>
                                </div>
                            </div>

                            <div className="h-px bg-border-theme opacity-30" />

                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-sm transition-transform group-hover:rotate-12">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-xl font-black text-text-primary leading-tight italic tracking-tighter">{stats.completed}</p>
                                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-50 italic">Tasks Completed</p>
                                </div>
                            </div>

                            <div className="h-px bg-border-theme opacity-30" />

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 opacity-70 italic">Skills</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {skills.map((skill, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-bold uppercase tracking-widest border border-blue-500/20">
                                                {skill}
                                                <button onClick={() => handleRemoveSkill(idx)} className="hover:text-white hover:bg-blue-500 rounded-full p-0.5 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newSkill} 
                                            onChange={(e) => setNewSkill(e.target.value)} 
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                                            placeholder="Add new skill..."
                                            className="flex-1 bg-surface-lighter border border-border-theme rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                        <button onClick={handleAddSkill} className="px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                            Add
                                        </button>
                                    </div>
                                </div>
                                <div className="h-px bg-border-theme opacity-30" />
                                <div>
                                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3 opacity-70 italic">Certifications</label>
                                    <div className="flex flex-col gap-2 mb-3">
                                        {certifications.map((cert, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-surface-lighter border border-border-theme rounded-xl group hover:border-blue-500/30 transition-colors">
                                                <div>
                                                    <p className="text-sm font-bold text-text-primary italic tracking-tight">{cert.name}</p>
                                                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-60">ID: {cert.credential_id}</p>
                                                </div>
                                                <button onClick={() => handleRemoveCert(idx)} className="p-2 text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        <input 
                                            type="text" 
                                            value={newCertName} 
                                            onChange={(e) => setNewCertName(e.target.value)} 
                                            placeholder="Certification Name"
                                            className="w-full bg-surface-lighter border border-border-theme rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500/50 transition-colors"
                                        />
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={newCertId} 
                                                onChange={(e) => setNewCertId(e.target.value)} 
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddCert()}
                                                placeholder="Credential ID"
                                                className="flex-1 bg-surface-lighter border border-border-theme rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500/50 transition-colors"
                                            />
                                            <button onClick={handleAddCert} disabled={!newCertName.trim() || !newCertId.trim()} className="px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white disabled:opacity-50 disabled:hover:bg-blue-500/10 disabled:hover:text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {isSaving && <p className="text-[10px] text-blue-500 font-bold italic tracking-widest text-center mt-4">Saving updates...</p>}
                            </div>

                            <div className="h-px bg-border-theme opacity-30" />

                            {!userData?.ngo_id ? (
                                <>
                                    <JoinNGO />
                                    <div className="h-px bg-border-theme opacity-30" />
                                </>
                            ) : null}

                            <div className="space-y-2 pb-8">
                                {userData?.ngo_id ? (
                                    <button 
                                        onClick={handleLeaveNGO}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-red-500/5 rounded-[20px] transition-all group text-left border border-transparent hover:border-red-500/10 active:scale-[0.98]"
                                    >
                                        <AlertTriangle className="w-5 h-5 text-red-500 opacity-70 group-hover:opacity-100" />
                                        <span className="text-[11px] font-black text-red-500 uppercase tracking-widest italic">Leave NGO</span>
                                    </button>
                                ) : null}
                                <button onClick={logout} className="w-full flex items-center gap-4 p-4 hover:bg-surface-lighter rounded-[20px] transition-all group text-left border border-transparent hover:border-border-theme active:scale-[0.98]">
                                    <LogOut className="w-5 h-5 text-text-secondary opacity-70 group-hover:opacity-100" />
                                    <span className="text-[11px] font-black text-text-primary uppercase tracking-widest italic">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
