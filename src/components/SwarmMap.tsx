import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { db } from "../lib/firebase";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { AlertCircle, Navigation, Trash2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// Safe remote URLs for default leaflet marker
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const criticalIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-8 h-8 bg-red-600 rounded-full border-2 border-white shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const NGO_COLORS: any = {
  Food: "#1e8e3e",
  Medical: "#d93025",
  Shelter: "#1a73e8",
  Rescue: "#f29900",
  Other: "#5f6368",
};

export default function SwarmMap() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const { userData } = useAuth();

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm("Are you sure you want to remove this task from the map?")) {
      try {
        await deleteDoc(doc(db, "tasks", taskId));
      } catch (error) {
        console.error("Error deleting task:", error);
        alert("Failed to delete task. Please try again.");
      }
    }
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error(err)
    );

    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return unsubscribe;
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapContainer 
        center={userLocation || [18.5204, 73.8567]} 
        zoom={13} 
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {userLocation && (
          <Marker position={userLocation} icon={defaultIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {tasks.map((task) => (
          <Marker 
            key={task.id} 
            position={[task.lat || 0, task.lng || 0]}
            icon={task.urgency === 'critical' ? criticalIcon : defaultIcon}
          >
            <Popup>
              <div className="p-1 min-w-[180px]">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h4 className="font-bold text-sm leading-tight flex-1">{task.title}</h4>
                  {userData?.ngo_id && userData.ngo_id === task.ngo_id && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }} 
                      className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors"
                      title="Remove Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase"
                    style={{ backgroundColor: NGO_COLORS[task.category] || "#5f6368" }}
                  >
                    {task.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${task.urgency === 'critical' ? 'border-red-500 text-red-500' : 'border-gray-400 text-gray-500'}`}>
                    {task.urgency}
                  </span>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2 mb-3">{task.description}</p>
                <button className="google-btn-primary w-full text-[10px] py-1">Claim Task</button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Swarm Alert Overlay */}
      {tasks.some(t => t.urgency === 'critical') && (
        <div className="absolute top-24 left-4 right-4 z-[1100]">
          <div className="bg-red-600 text-white p-4 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.5)] flex items-center gap-3 animate-pulse border border-white/20">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wide">Critical Swarm Alert</p>
              <p className="text-[10px] opacity-90">Medical supplies needed 0.4 miles away</p>
            </div>
          </div>
        </div>
      )}
      {/* Technical Coordinate Overlay */}
      <div className="absolute bottom-24 right-4 z-[1000] flex flex-col items-end gap-1 pointer-events-none">
        <div className="bg-surface/80 backdrop-blur-md border border-border-theme px-3 py-1.5 rounded-lg flex flex-col items-end shadow-lg">
            <span className="text-[10px] text-blue-500 font-mono tracking-wider tabular-nums font-bold">
                LAT: {userLocation?.[0].toFixed(4) || "18.5204"}° N
            </span>
            <span className="text-[10px] text-blue-500 font-mono tracking-wider tabular-nums font-bold">
                LNG: {userLocation?.[1].toFixed(4) || "73.8567"}° E
            </span>
        </div>
        <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-[8px] text-blue-600 font-mono uppercase tracking-[0.2em] font-black italic">Live Link Readout</span>
        </div>
      </div>
    </div>
  );
}
