import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, getDocs, doc, updateDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { User, Users, ChevronRight, CheckCircle } from "lucide-react";

export default function Onboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"volunteer" | "ngo_admin" | null>(null);
  const [ngos, setNgos] = useState<any[]>([]);
  const [selectedNgo, setSelectedNgo] = useState<any>(null);
  const [ngoCode, setNgoCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNgos = async () => {
      const defaultNgos = [
        { id: "red-cross", name: "Red Cross Relief", category: "General", admin_uid: "system" },
        { id: "doctors-borders", name: "Doctors Without Borders", category: "Medical", admin_uid: "system" },
        { id: "habitat-humanity", name: "Habitat for Humanity", category: "Shelter", admin_uid: "system" },
        { id: "food-for-all", name: "Food For All", category: "Food", admin_uid: "system" }
      ];
      try {
        const q = await getDocs(collection(db, "ngos"));
        if (q.empty) {
          setNgos(defaultNgos);
        } else {
          setNgos(q.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error("Error fetching NGOs:", error);
        setNgos(defaultNgos);
      }
    };
    fetchNgos();
  }, []);

  const handleFinish = async () => {
    if (!user || !role) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photo_url: user.photoURL,
        role: role,
        ngo_id: null,
        onboarded: true,
        created_at: new Date().toISOString()
      });

      if (selectedNgo) {
          const ngoObj = ngos.find(n => n.id === selectedNgo?.id || n.id === selectedNgo);
          if (ngoObj) {
              await addDoc(collection(db, "join_requests"), {
                  user_id: user.uid,
                  user_name: user.displayName || user.email?.split("@")[0] || "Unknown",
                  ngo_id: ngoObj.id,
                  ngo_name: ngoObj.name,
                  status: "pending",
                  created_at: serverTimestamp()
              });
          }
      }

      // Force reload or state update would happen via AuthContext listener
      window.location.reload(); 
    } catch (error) {
      console.error("Error onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(step + 1);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden text-text-primary">
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
      <div className="max-w-md w-full relative z-10">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-2"
            >
              <h2 className="text-4xl font-bold tracking-tight text-text-primary italic">SET <span className="text-blue-500">OBJECTIVE</span></h2>
              <p className="text-text-secondary text-sm font-medium uppercase tracking-[0.2em] mb-12">Initialize your mission protocol</p>
              
              <div className="space-y-4">
                <button
                  onClick={() => { setRole("volunteer"); nextStep(); }}
                  className="w-full text-left p-6 material-card hover:bg-primary/5 group transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 -mr-8 -mt-8 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                  <User className="w-8 h-8 text-blue-500 mb-4" />
                  <h3 className="text-xl font-bold text-text-primary mb-1">Field Volunteer</h3>
                  <p className="text-xs text-text-secondary leading-relaxed uppercase tracking-widest font-bold opacity-60">Operations & Action</p>
                </button>

                <button
                  onClick={() => { setRole("ngo_admin"); nextStep(); }}
                  className="w-full text-left p-6 material-card hover:bg-primary/5 group transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 -mr-8 -mt-8 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                  <Users className="w-8 h-8 text-blue-500 mb-4" />
                  <h3 className="text-xl font-bold text-text-primary mb-1">Command Admin</h3>
                  <p className="text-xs text-text-secondary leading-relaxed uppercase tracking-widest font-bold opacity-60">Logistics & Strategy</p>
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && role === "volunteer" && (
            <motion.div
              key="step2v"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-text-primary tracking-tight uppercase">Select Operations Group</h2>
              <p className="text-text-secondary text-[10px] font-bold uppercase tracking-[0.2em] mb-6">Align with a regional NGO</p>
              
              <div className="space-y-3 max-h-[350px] overflow-y-auto mb-6 pr-2 custom-scrollbar">
                {ngos.map((ngo) => (
                  <div
                    key={ngo.id}
                    onClick={() => setSelectedNgo(ngo)}
                    className={`p-4 material-card cursor-pointer transition-all border border-border-theme shadow-sm bg-surface ${selectedNgo?.id === ngo.id ? 'ring-2 ring-blue-500 bg-blue-500/5' : 'hover:bg-blue-500/5'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-black text-sm text-text-primary uppercase italic tracking-tight">{ngo.name}</h4>
                      <span className="text-[9px] font-black text-blue-600 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 uppercase tracking-widest italic">{ngo.category}</span>
                    </div>
                    <p className="text-[10px] text-text-secondary mb-3 truncate font-bold uppercase italic opacity-70 leading-relaxed">{ngo.description}</p>
                    <div className="flex items-center gap-4 text-[9px] text-text-secondary uppercase tracking-[0.15em] font-black italic">
                      <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div> {ngo.member_count || 0} PEERS</span>
                    </div>
                  </div>
                ))}
                {ngos.length === 0 && (
                  <div className="text-center py-8 text-text-secondary italic text-sm border-2 border-dashed border-[var(--border)] rounded-2xl">
                    No active NGOs found in this region.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  disabled={!selectedNgo || loading}
                  onClick={handleFinish}
                  className="google-btn-primary w-full"
                >
                  {loading ? "LINKING..." : "COMMIT TO SECTOR"}
                  <CheckCircle className="w-5 h-5 ml-2" />
                </button>
                <button
                  disabled={loading}
                  onClick={() => { setSelectedNgo(null); handleFinish(); }}
                  className="google-btn-secondary w-full"
                >
                  SKIP FOR NOW
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && role === "ngo_admin" && (
            <motion.div
              key="step2a"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-2xl font-bold text-text-primary tracking-tight uppercase">Registry Access</h2>
              <p className="text-text-secondary text-[10px] font-bold uppercase tracking-[0.2em] mb-8">Confirm your organizational identity</p>
              
              <input
                type="text"
                value={ngoCode}
                onChange={(e) => setNgoCode(e.target.value)}
                placeholder="EXACT NGO NAME"
                className="w-full p-4 bg-surface border border-[var(--border)] rounded-2xl outline-none focus:ring-2 ring-blue-500 text-text-primary font-bold placeholder:text-text-secondary/40 mb-6"
              />

              {ngos.find(n => n.name.toLowerCase() === ngoCode.toLowerCase()) && (
                <div className="p-4 material-card border-green-500/30 bg-green-500/10 mb-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-green-400 uppercase mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div> Match Found
                  </div>
                  <h4 className="font-bold text-text-primary uppercase text-sm tracking-wide">{ngos.find(n => n.name.toLowerCase() === ngoCode.toLowerCase()).name}</h4>
                </div>
              )}

              <button
                disabled={!ngos.find(n => n.name.toLowerCase() === ngoCode.toLowerCase()) || loading}
                onClick={() => {
                  setSelectedNgo(ngos.find(n => n.name.toLowerCase() === ngoCode.toLowerCase()));
                  handleFinish();
                }}
                className="google-btn-primary w-full"
              >
                {loading ? "VERIFYING..." : "ACTIVATE AS ADMIN"}
                <CheckCircle className="w-5 h-5 ml-2" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
