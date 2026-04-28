import React, { useState, useEffect } from "react";
import { signInWithGoogle, auth, db } from "../lib/firebase";
import { LogIn, Building2, ChevronDown, Lock, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

export default function Login() {
  const [showNgoLogin, setShowNgoLogin] = useState(false);
  const [ngos, setNgos] = useState<any[]>([]);
  const [selectedNgo, setSelectedNgo] = useState<string>("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
          // Seed default NGOs for demo
          for (const ngo of defaultNgos) {
            await setDoc(doc(db, "ngos", ngo.id), {
              name: ngo.name,
              category: ngo.category,
              admin_uid: ngo.admin_uid,
              created_at: new Date().toISOString(),
              member_count: 10
            });
          }
          setNgos(defaultNgos);
        } else {
          const fetchedNgos = q.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Ensure we don't have empty NGOs if DB is reset
          if (fetchedNgos.length > 0) {
            setNgos(fetchedNgos);
          } else {
            setNgos(defaultNgos);
          }
        }
      } catch (error) {
        console.error("Error fetching/seeding NGOs:", error);
        setNgos(defaultNgos); // Fallback to default
      }
    };
    fetchNgos();
  }, []);

  const handleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // It should automatically navigate via AuthContext state change.
      // If it takes too long, we can reset state so user can try again.
      setTimeout(() => setGoogleLoading(false), 5000);
    } catch (error) {
      alert("Failed to sign in. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleNgoLogin = async () => {
    if (password !== "12345") {
      alert("Invalid NGO Access Key");
      return;
    }
    if (!selectedNgo) {
      alert("Please select an NGO");
      return;
    }

    setLoading(true);
    try {
      // Use Anonymous Auth for NGO admins to avoid Google requirement
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      
      const ngo = ngos.find(n => n.id === selectedNgo);
      if (!ngo) {
          throw new Error("Selected NGO data could not be retrieved from the cluster.");
      }

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: `${ngo.name} Admin`,
        email: `admin@${ngo.id}.sahay.org`, // Simulated professional email
        role: "ngo_admin",
        ngo_id: selectedNgo,
        onboarded: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { merge: true });
      
    } catch (error: any) {
      console.error("Error NGO login:", error);
      let message = error.message || "Failed to authorize NGO account.";
      
      if (error.code === 'auth/admin-restricted-operation') {
        message = "ADMIN_ERROR: Anonymous Authentication is disabled in Firebase Console. Please enable it in 'Authentication > Sign-in method' to use NGO login without Google.";
      }
      
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: "linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center relative z-10"
      >
        <div className="mb-12">
          <img src="/logo.png" alt="Sahay Logo" className="w-36 h-36 object-contain mx-auto mb-0 hover:scale-105 transition-transform drop-shadow-2xl" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling!.style.display = 'flex'; }} />
          <div className="hidden w-20 h-20 bg-blue-600 rounded-2xl mx-auto items-center justify-center shadow-2xl shadow-blue-900/40 mb-0 group hover:scale-105 transition-transform" style={{ display: 'none' }}>
            <div className="grid grid-cols-2 gap-1 p-3 flex-shrink-0">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-full h-full bg-white/60 rounded-sm group-hover:bg-white transition-colors" />
              ))}
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tighter text-text-primary mb-2 uppercase italic">Sahay</h1>
          <p className="text-text-secondary font-medium uppercase tracking-[0.2em] text-xs">Coordinate. Respond. Save Lives.</p>
        </div>

        <div className="material-card p-2 rounded-3xl mb-4 bg-blue-600/5 border-blue-500/20">
          <button 
            onClick={handleLogin}
            disabled={googleLoading}
            className="google-btn-primary w-full flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "AUTHORIZING..." : "Login with Google"}
          </button>
        </div>
        
        {googleLoading && (
          <p className="text-[10px] text-blue-400 font-bold italic text-center mb-6 uppercase tracking-widest px-4 border border-blue-500/20 bg-blue-500/10 py-2 rounded-xl">
            If authorization hangs, please open the app in a new tab using the icon in the top right corner.
          </p>
        )}

        <div className="relative mb-8 mt-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-theme opacity-50"></div></div>
          <div className="relative flex justify-center text-[9px] uppercase font-black tracking-[0.4em] italic"><span className="bg-background px-4 text-text-secondary">Secure Uplink</span></div>
        </div>

        <div className="bg-surface/40 backdrop-blur-xl p-6 rounded-[32px] text-left border border-border-theme shadow-2xl relative overflow-hidden group aura-ring">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all"></div>
          <button 
            onClick={() => setShowNgoLogin(!showNgoLogin)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-primary uppercase italic tracking-tight">NGO Portal</h3>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-0.5 opacity-80 italic">Authorized Personnel Only</p>
              </div>
            </div>
            <motion.div animate={{ rotate: showNgoLogin ? 180 : 0 }}>
              <ChevronDown className="w-5 h-5 text-text-secondary" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showNgoLogin && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.1em] ml-1">Select Organization</label>
                    <div className="relative">
                      <select 
                        value={selectedNgo}
                        onChange={(e) => setSelectedNgo(e.target.value)}
                        className="w-full p-3.5 bg-surface-lighter border border-border-theme rounded-2xl outline-none focus:ring-1 ring-blue-500/50 text-text-primary text-sm appearance-none font-bold cursor-pointer shadow-inner"
                      >
                        <option value="">Choose your NGO</option>
                        {ngos.map(ngo => (
                          <option key={ngo.id} value={ngo.id}>{ngo.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black text-text-secondary uppercase tracking-[0.1em]">Access Key</label>
                      <span className="text-[10px] text-blue-400 font-bold tracking-widest italic">Test Password: 12345</span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="ENTER 5-DIGIT KEY"
                        className="w-full p-3.5 pl-11 bg-surface-lighter border border-border-theme rounded-2xl outline-none focus:ring-1 ring-blue-500/50 text-text-primary text-sm font-mono tracking-[0.2em] shadow-inner"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleNgoLogin}
                    disabled={loading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 text-white rounded-2xl font-bold uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                  >
                    {loading ? "AUTHORIZING..." : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Authorize Session
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        

      </motion.div>
    </div>
  );
}
