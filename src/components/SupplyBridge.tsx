import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDoc, increment, deleteDoc, setDoc } from "firebase/firestore";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { Package, MapPin, ArrowRightLeft, CreditCard, Check, X, Filter, LayoutGrid, List, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function SupplyBridge() {
  const { userData } = useAuth();
  const [supplies, setSupplies] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"swipe" | "list" | "mine">("swipe");
  const [activeCategory, setActiveCategory] = useState("All");
  const [mySupplies, setMySupplies] = useState<any[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    // Only show supplies NOT owned by the current NGO
    const unsubscribe = onSnapshot(collection(db, "supplies"), (snapshot) => {
      const allSupplies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const othersSupplies = allSupplies.filter(s => s.owner_ngo_id !== userData?.ngo_id && s.trade_status === "available");
      const ownSupplies = allSupplies.filter(s => s.owner_ngo_id === userData?.ngo_id);
      setSupplies(othersSupplies);
      setMySupplies(ownSupplies);
    });
    return unsubscribe;
  }, [userData?.ngo_id]);

  const categories = ["All", "Food", "Medical", "Shelter", "Clothing", "Equipment", "Rescue"];
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", qty: 1, unit: "units", category: "Food" });

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
        setNewItem({ name: "", qty: 1, unit: "units", category: "Food" });
        alert("Asset listed on the Bridge!");
    } catch (error) {
        console.error(error);
    }
  };

  const filteredSupplies = activeCategory === "All" 
    ? supplies 
    : supplies.filter(s => s.category === activeCategory);

  const filteredMySupplies = activeCategory === "All"
    ? mySupplies
    : mySupplies.filter(s => s.category === activeCategory);

  const [isTrading, setIsTrading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: userData?.uid,
        email: userData?.email,
        role: userData?.role
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    return new Error(JSON.stringify(errInfo));
  };

  const requestSupply = async (supply: any) => {
    console.log("Requesting supply:", supply.item_name);
    setTradeError(null);
    
    if (!userData?.ngo_id) {
        setTradeError("Action restricted: Your account must be linked to an NGO to perform requests.");
        return;
    }
    
    if (isTrading) return;
    
    setIsTrading(true);
    try {
      await updateDoc(doc(db, "supplies", supply.id), {
        trade_status: "requested",
        requester_ngo_id: userData.ngo_id,
        requester_ngo_name: userData.name.replace(" Admin", ""),
        requested_at: serverTimestamp()
      });
      
      await addDoc(collection(db, "notifications"), {
        target_id: supply.owner_ngo_id,
        type: "trade",
        title: "Trade Request",
        body: `${userData.name.replace(" Admin", "")} requested your ${supply.quantity} ${supply.item_name}! Tap to coordinate.`,
        created_at: serverTimestamp(),
        read: false
      });

      alert("Supply request transmitted to " + supply.owner_ngo_name + ".");
      
      if (viewMode === "swipe") {
        setCurrentIndex(prev => prev + 1);
      }
    } catch (error: any) {
      console.error("Request Failure:", error);
      alert(`Request failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsTrading(false);
    }
  };

  const handleRespond = async (supply: any, action: "accept" | "decline") => {
    if (!userData?.ngo_id) return;
    setIsTrading(true);
    
    try {
      if (action === "decline") {
        await updateDoc(doc(db, "supplies", supply.id), {
          trade_status: "available",
          requester_ngo_id: null,
          requester_ngo_name: null,
          requested_at: null
        });
        alert("Request declined. Item restored to the Bridge.");
      } else {
        // Accept Logic (Finalize Trade)
        
        // Log transaction
        await addDoc(collection(db, "transactions"), {
          item_id: supply.id,
          item_name: supply.item_name,
          quantity: supply.quantity || 1,
          category: supply.category,
          from_ngo: userData.ngo_id,
          to_ngo: supply.requester_ngo_id,
          timestamp: serverTimestamp()
        });

        // Mark as traded or delete
        await updateDoc(doc(db, "supplies", supply.id), {
          trade_status: "traded",
          completed_at: serverTimestamp()
        });

        // Send Trade Accepted / Dispatch Update Notification
        await addDoc(collection(db, "notifications"), {
          target_id: supply.requester_ngo_id,
          type: "dispatch",
          title: "Trade Accepted & Dispatch Created",
          body: `Your request for ${supply.quantity} ${supply.item_name} was accepted. Your supplies are on the way! ETA: 30 minutes.`,
          created_at: serverTimestamp(),
          read: false
        });

        alert("Trade finalized! Logistics protocol initiated.");
      }
    } catch (error: any) {
      console.error("Action Failure:", error);
      alert(`Action failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsTrading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col p-6">
      <header className="flex justify-between items-center mb-8 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter uppercase text-text-primary">Supplies</h2>
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em]">Open Inventory supplies</p>
          </div>
          <div className="flex gap-2 material-card p-1.5 shadow-inner">
            <button 
                onClick={() => setViewMode("swipe")}
                className={`p-2 rounded-xl transition-all ${viewMode === "swipe" ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "text-text-secondary hover:bg-surface-lighter"}`}
            >
                <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-xl transition-all ${viewMode === "list" ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "text-text-secondary hover:bg-surface-lighter"}`}
            >
                <List className="w-4 h-4" />
            </button>
            <button 
                onClick={() => setViewMode("mine")}
                className={`p-2 rounded-xl transition-all ${viewMode === "mine" ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]" : "text-text-secondary hover:bg-surface-lighter"}`}
            >
                <Package className="w-4 h-4" />
            </button>
            {userData?.role === 'ngo_admin' && (
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className={`ml-1 p-2 rounded-xl transition-all ${isAdding ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"}`}
                >
                    <Plus className="w-4 h-4" />
                </button>
            )}
          </div>
      </header>

      <div className="flex-shrink-0">
        <AnimatePresence>
          {isAdding && (
              <motion.div 
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: "auto", opacity: 1, marginBottom: 32 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  className="overflow-hidden"
              >
                  <form onSubmit={handleAddAsset} className="p-6 border border-orange-500/20 bg-orange-500/5 backdrop-blur-xl rounded-[32px] aura-ring relative overflow-hidden shadow-xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                      <div className="flex justify-between items-center mb-6 relative z-10">
                          <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
                              <Package className="w-3 h-3" />
                              Register Distributed Asset
                          </h3>
                          <button type="button" onClick={() => setIsAdding(false)} className="p-1.5 bg-surface-lighter rounded-lg text-text-secondary hover:text-text-primary transition-colors border border-border-theme">
                              <X className="w-4 h-4" />
                          </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 relative z-10">
                          <div className="md:col-span-2">
                              <label className="text-[9px] font-black text-text-secondary uppercase mb-1.5 block tracking-widest">Item Name</label>
                              <input required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-background-dark border border-border-theme rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-orange-500/50 transition-all placeholder:text-text-secondary/30" placeholder="e.g. Rice (50kg Bag)" />
                          </div>
                          <div>
                              <label className="text-[9px] font-black text-text-secondary uppercase mb-1.5 block tracking-widest">Quantity</label>
                              <input type="number" required min="1" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: Number(e.target.value)})} className="w-full bg-background-dark border border-border-theme rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-orange-500/50 transition-all" />
                          </div>
                          <div className="relative">
                              <label className="text-[9px] font-black text-text-secondary uppercase mb-1.5 block tracking-widest">Category</label>
                              <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full bg-background-dark border border-border-theme rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-orange-500/50 transition-all appearance-none cursor-pointer">
                                  {categories.filter(c => c !== "All").map(c => <option key={c} value={c} className="bg-background-dark text-text-primary">{c}</option>)}
                              </select>
                              <div className="absolute right-4 bottom-3.5 pointer-events-none text-text-secondary">
                                  <Filter className="w-3 h-3" />
                              </div>
                          </div>
                      </div>
                      <button type="submit" className="w-full mt-6 google-btn-primary relative z-10 !bg-orange-600 hover:!bg-orange-500 shadow-orange-900/20">
                          Authorize Supply Listing
                      </button>
                  </form>
              </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center pb-6 flex-shrink-0 relative">
          <div className="relative">
            <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-5 py-2.5 material-card text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeCategory !== "All" ? "bg-blue-500/10 border-blue-500/30 text-blue-500 shadow-sm" : "text-text-secondary"
                }`}
            >
              <Filter className={`w-3.5 h-3.5 ${activeCategory !== "All" ? "text-blue-500" : "text-text-secondary"}`} />
              {activeCategory === "All" ? "Filter Category" : activeCategory}
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 z-50 w-48 bg-surface backdrop-blur-2xl border border-border-theme rounded-2xl shadow-2xl overflow-hidden p-1.5"
                  >
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat); setCurrentIndex(0); setIsFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          activeCategory === cat ? "bg-blue-600 text-white" : "text-text-secondary hover:bg-surface-lighter"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {viewMode === "mine" && (
            <div className="px-4 py-1.5 material-card !rounded-full border-purple-500/20 bg-purple-500/10 shadow-none">
              <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Your Listings: {filteredMySupplies.length}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative min-h-[460px] flex items-center justify-center">
        {viewMode === "swipe" ? (
          <div className="relative w-full max-w-[340px] h-[480px]">
            {/* Visual Instructions */}
            <div className="absolute -bottom-12 left-0 right-0 flex justify-between px-6 opacity-40 pointer-events-none z-0">
              <div className="flex flex-col items-center">
                <div className="text-[7px] font-black uppercase text-text-secondary mb-1.5 tracking-[0.2em]">Pass</div>
                <div className="w-9 h-9 rounded-full border border-border-theme flex items-center justify-center bg-surface/50">
                  <X className="w-3.5 h-3.5 text-red-500/70" />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[7px] font-black uppercase text-text-secondary mb-1.5 tracking-[0.2em]">Browse</div>
                <div className="w-9 h-9 rounded-full border border-border-theme flex items-center justify-center bg-surface/50">
                  <Plus className="w-3.5 h-3.5 text-blue-500/70 -rotate-45" />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[7px] font-black uppercase text-text-secondary mb-1.5 tracking-[0.2em]">Request</div>
                <div className="w-9 h-9 rounded-full border border-border-theme flex items-center justify-center bg-surface/50">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500/70" />
                </div>
              </div>
            </div>

            <AnimatePresence mode="popLayout" initial={false}>
              {tradeError && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute -top-16 left-0 right-0 z-[100] bg-red-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl border border-red-400/50 shadow-xl flex items-center justify-between mx-4"
                >
                  <div className="flex items-center gap-3">
                    <X className="w-4 h-4" />
                    <span className="leading-tight">{tradeError}</span>
                  </div>
                  <button onClick={() => setTradeError(null)} className="ml-2 bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors">
                    <Check className="w-3 h-3 text-white" />
                  </button>
                </motion.div>
              )}
              {filteredSupplies.length > currentIndex ? [0, 1, 2].map((offset) => {
                const index = currentIndex + offset;
                const supply = filteredSupplies[index];
                if (!supply) return null;
                
                const stackIndex = offset;
                const isTop = stackIndex === 0;

                return (
                  <SwipeCard 
                    key={supply.id} 
                    supply={supply} 
                    onAccept={() => requestSupply(supply)} 
                    onReject={() => setCurrentIndex(prev => prev + 1)}
                    isTop={isTop}
                    stackIndex={stackIndex}
                    isTrading={isTrading && isTop}
                  />
                );
              }) : (
                <motion.div 
                  key="no-more"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center text-center p-8 bg-surface/50 backdrop-blur-md border border-dashed border-border-theme rounded-[32px]"
                >
                  <div>
                    <Package className="w-16 h-16 text-text-secondary opacity-20 mx-auto mb-6" />
                    <p className="text-text-secondary font-black uppercase tracking-[0.3em] text-[10px] mb-2 italic">Sector Cleared</p>
                    <p className="text-[9px] text-text-secondary/60 mb-6 font-bold">No additional assets detected in range.</p>
                    <button 
                      onClick={() => setCurrentIndex(0)} 
                      className="text-blue-500 text-[10px] uppercase font-black tracking-[0.2em] bg-blue-500/10 px-6 py-3 rounded-full hover:bg-blue-500/20 transition-all border border-blue-500/20 shadow-lg shadow-blue-500/5"
                    >
                      Refresh Radar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : viewMode === "list" ? (
          <div className="w-full h-full overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {filteredSupplies.map((supply) => (
              <div key={supply.id} className="p-4 flex justify-between items-center bg-surface border border-border-theme rounded-2xl shadow-lg">
                <div>
                    <h4 className="font-bold text-sm text-text-primary mb-1">{supply.item_name}</h4>
                    <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">{supply.owner_ngo_name} // 0.8 MI</p>
                </div>
                <div className="text-right">
                    <p className="font-mono text-blue-500 font-bold text-sm mb-2">{supply.quantity} {supply.unit}</p>
                    <button onClick={() => requestSupply(supply)} className="text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-blue-900/20 shadow-lg">Trade</button>
                </div>
              </div>
            ))}
            {filteredSupplies.length === 0 && (
                <div className="text-center py-20 opacity-50">
                    <Package className="w-12 h-12 mx-auto mb-4 text-text-secondary" />
                    <p className="text-xs uppercase font-black tracking-widest text-text-secondary">No Supplies</p>
                </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {filteredMySupplies.map((supply) => (
              <div key={supply.id} className={`p-4 border rounded-2xl transition-all shadow-lg ${
                supply.trade_status === 'traded' 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : supply.trade_status === 'requested'
                    ? 'bg-blue-500/10 border-blue-500/30 scale-[1.02]'
                    : 'bg-surface border-border-theme'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm text-text-primary uppercase tracking-tight italic">{supply.item_name}</h4>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                              supply.trade_status === 'traded' ? 'bg-success-theme/10 text-success-theme border-success-theme/20' : 
                              supply.trade_status === 'requested' ? 'bg-blue-500/20 text-blue-500 border-blue-500/40 animate-pulse' :
                              'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}>
                              {supply.trade_status}
                          </span>
                      </div>
                      <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest italic opacity-70">
                          {supply.category} // {supply.created_at ? new Date(supply.created_at.toDate()).toLocaleDateString() : 'Pending'}
                      </p>
                      
                      {supply.trade_status === 'requested' && (
                        <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-3 italic">
                          Incoming Request: {supply.requester_ngo_name || "System"}
                        </p>
                      )}
                  </div>
                  <div className="text-right">
                      <p className="font-mono text-purple-500 font-bold text-sm">{supply.quantity} {supply.unit}</p>
                      {supply.trade_status === 'traded' && (
                          <p className="text-[8px] text-green-500 mt-1 font-black uppercase tracking-[0.2em]">Closed Account</p>
                      )}
                  </div>
                </div>

                {supply.trade_status === 'requested' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-blue-500/10">
                    <button 
                      onClick={() => handleRespond(supply, "decline")}
                      disabled={isTrading}
                      className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/20"
                    >
                      Decline
                    </button>
                    <button 
                      onClick={() => handleRespond(supply, "accept")}
                      disabled={isTrading}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20"
                    >
                      Trade
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filteredMySupplies.length === 0 && (
                <div className="text-center py-20 opacity-50">
                    <Package className="w-12 h-12 mx-auto mb-4 text-text-secondary" />
                    <p className="text-xs uppercase font-black tracking-widest text-text-secondary">
                        {activeCategory === "All" ? "No listing registered" : `No ${activeCategory} listings`}
                    </p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SwipeCard({ supply, onAccept, onReject, isTop, stackIndex, isTrading }: { supply: any, onAccept: () => void | Promise<void>, onReject: () => void | Promise<void>, isTop: boolean, stackIndex: number, isTrading?: boolean, key?: any }) {
  const [direction, setDirection] = useState(0);
  const x = useMotionValue(0);
  const rotateValue = useTransform(x, [-200, 200], [-15, 15]);
  const opacityValue = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  const acceptOpacity = useTransform(x, [20, 100], [0, 1]);
  const rejectOpacity = useTransform(x, [-100, -20], [1, 0]);

  const getIcon = (cat: string) => {
    switch(cat) {
        case 'Food': return '🍱';
        case 'Medical': return '💊';
        case 'Shelter': return '🏠';
        case 'Clothing': return '👕';
        case 'Equipment': return '⚙️';
        case 'Rescue': return '🚁';
        default: return '📦';
    }
  };

  const variants = {
    initial: (stackIdx: number) => ({
      scale: 1 - (stackIdx * 0.05),
      y: stackIdx * 20,
      opacity: stackIdx > 2 ? 0 : 1,
      zIndex: 50 - stackIdx,
      x: 0,
      rotate: 0,
      filter: stackIdx === 0 ? "blur(0px)" : "blur(2px)"
    }),
    animate: (stackIdx: number) => ({
      scale: 1 - (stackIdx * 0.05),
      y: stackIdx * 20,
      opacity: stackIdx > 2 ? 0 : 1,
      zIndex: 50 - stackIdx,
      x: 0,
      rotate: 0,
      filter: stackIdx === 0 ? "blur(0px)" : "blur(2px)",
      transition: { duration: 0.4, ease: "easeOut" }
    }),
    exit: (dir: number) => ({
      x: dir * 500,
      y: 0,
      opacity: 0,
      scale: 0.8,
      rotate: dir * 15,
      transition: { duration: 0.4, ease: "easeIn" }
    })
  };

  const handleAction = (dir: number, action: () => void) => {
    setDirection(dir);
    action();
  };

  const handleDragEnd = (event: any, info: any) => {
    if (!isTop || isTrading) return;
    const threshold = 100;
    if (info.offset.x >= threshold) {
      handleAction(1, onAccept);
    } else if (info.offset.x <= -threshold) {
      handleAction(-1, onReject);
    }
  };

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      drag={isTop && !isTrading ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      style={{ 
        x: isTop ? x : 0, 
        rotate: isTop ? rotateValue : 0, 
        zIndex: 50 - stackIndex,
        touchAction: "none"
      }}
      className={`absolute w-full h-full bg-surface border border-border-theme aura-ring shadow-2xl p-7 flex flex-col justify-between overflow-hidden rounded-[36px] ${!isTop ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {/* Swipe Overlay Indicators */}
      {isTop && (
        <>
          <motion.div 
            style={{ opacity: acceptOpacity }} 
            className="absolute inset-0 z-50 pointer-events-none bg-blue-500/10 flex items-center justify-center opacity-0"
          >
            <div className="border-4 border-blue-500 text-blue-500 font-black text-4xl uppercase tracking-widest px-6 py-2 rounded-2xl rotate-[-15deg]">
              Trade
            </div>
          </motion.div>
          <motion.div 
            style={{ opacity: rejectOpacity }} 
            className="absolute inset-0 z-50 pointer-events-none bg-red-500/10 flex items-center justify-center opacity-0"
          >
            <div className="border-4 border-red-500 text-red-500 font-black text-4xl uppercase tracking-widest px-6 py-2 rounded-2xl rotate-[15deg]">
              Pass
            </div>
          </motion.div>
        </>
      )}

      <div className={`transition-opacity duration-300 ${!isTop ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex justify-between items-start">
            <div className="w-20 h-20 bg-surface-lighter rounded-[24px] flex items-center justify-center text-4xl shadow-inner border border-border-theme">
              {getIcon(supply.category)}
            </div>
            <div className="text-right">
                <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-blue-500/20 italic">{supply.category}</span>
            </div>
        </div>

        <div className="mt-8 space-y-2">
            <h3 className="text-3xl font-black text-text-primary leading-none tracking-tight italic">{supply.item_name}</h3>
            <p className="text-blue-500 font-mono text-xl font-black tracking-tighter italic opacity-80">{supply.quantity} {supply.unit}</p>
            
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border-theme/50">
                <div className="w-10 h-10 rounded-2xl bg-surface-lighter flex items-center justify-center text-sm font-black text-text-secondary border border-border-theme shadow-sm">
                    {supply.owner_ngo_name?.charAt(0)}
                </div>
                <div className="flex-1">
                    <p className="text-[10px] text-text-primary font-black leading-none mb-1 tracking-tight">{supply.owner_ngo_name?.toUpperCase()}</p>
                    <p className="text-[8px] text-text-secondary font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 italic opacity-60">
                        <MapPin className="w-2.5 h-2.5" /> 0.8 MILES AWAY
                    </p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-surface-lighter/50 rounded-2xl p-4 border border-border-theme shadow-sm group-hover:bg-surface-lighter transition-all">
                <p className="text-[7px] text-text-secondary font-black uppercase mb-1.5 tracking-widest opacity-60">Impact Reward</p>
                <p className="text-sm font-black text-yellow-600 italic">+{supply.quantity * (supply.category === 'Medical' ? 3 : supply.category === 'Food' ? 2 : 1)} CR</p>
            </div>
            <div className="bg-surface-lighter/50 rounded-2xl p-4 border border-border-theme shadow-sm group-hover:bg-surface-lighter transition-all">
                <p className="text-[7px] text-text-secondary font-black uppercase mb-1.5 tracking-widest opacity-60">Trade Velocity</p>
                <p className="text-sm font-black text-blue-500 italic">FAST</p>
            </div>
        </div>
      </div>

      {isTop && (
        <div className="flex gap-4 mt-6">
          <button 
            disabled={isTrading}
            onClick={() => handleAction(-1, onReject)}
            className={`flex-1 bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/10 py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-sm ${isTrading ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <X className="w-4 h-4 opacity-70" />
            Reject
          </button>
          <button 
            disabled={isTrading}
            onClick={() => handleAction(1, onAccept)}
            className={`flex-1 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${isTrading ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            {isTrading ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
               <ArrowRightLeft className="w-4 h-4" />
            )}
            {isTrading ? 'Relay...' : 'Trade'}
          </button>
        </div>
      )}
    </motion.div>
  );
}
