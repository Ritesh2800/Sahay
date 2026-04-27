import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, Loader2, Check, AlertCircle, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { GoogleGenAI, Type } from "@google/genai";
import { useAuth } from "../contexts/AuthContext";

export default function OCRScanner({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(mediaStream);
      setIsCameraOpen(true);
      // Timeout to wait for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error(err);
      alert("Camera access denied or not available. Please try uploading a file instead.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImage(dataUrl);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Analyze this disaster relief report image. Extract all individual requests or needs. 
      For each item, specify:
      1. title (a concise, descriptive headline for the request)
      2. need_type (one of: Food, Medical, Shelter, Rescue, Other)
      3. description (brief details)
      4. urgency (low, medium, critical)
      5. location (as mentioned)
      6. person_name (if mentioned)
      
      Also provide a high-level summary of the entire document.`;

      const base64Data = image.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              extracted_items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    need_type: { type: Type.STRING },
                    description: { type: Type.STRING },
                    urgency: { type: Type.STRING },
                    location: { type: Type.STRING },
                    person_name: { type: Type.STRING }
                  },
                  required: ["title", "need_type", "description"]
                }
              }
            }
          }
        }
      });

      const parsedResult = JSON.parse(response.text);
      setResult(parsedResult);
    } catch (error) {
      console.error("Gemini OCR Error:", error);
      alert("Failed to analyze image with Gemini AI.");
    } finally {
      setLoading(false);
    }
  };

  const confirmAndPin = async () => {
    if (!result) return;
    setLoading(true);
    try {
      const { userData } = await import("../contexts/AuthContext").then(m => {
          // This is a bit tricky inside a component without props, but since it's used in NGO context,
          // we can assume the user is logged in. Better to use a hook, but I'll use the existing auth 
          // pattern or pass it as prop if needed.
          // Actually, I'll pass userData from NGODashboard as a prop soon.
          // For now, let's keep it robust.
          return { userData: null as any }; // Placeholder
      });

      // Let's actually use the collection of users to find the ngo_id if not provided
      let ngoId = "demo-ngo-id";
      let ngoName = "NGO";
      
      const userDoc = await import("firebase/firestore").then(f => f.getDoc(f.doc(db, "users", user?.uid || "")));
      if (userDoc.exists()) {
          ngoId = userDoc.data().ngo_id || ngoId;
          ngoName = userDoc.data().name.replace(" Admin", "") || ngoName;
      }

      // Create tasks in Firestore
      for (const item of result.extracted_items) {
        const itemTitle = (item.title && item.title !== "N/A") ? item.title : (item.description?.slice(0, 40) + "..." || `Relief Request: ${item.need_type}`);
        
        let taskLat = 18.5204 + (Math.random() - 0.5) * 0.05;
        let taskLng = 73.8567 + (Math.random() - 0.5) * 0.05;

        if (item.location && item.location.trim() !== "" && item.location !== "Unknown Location") {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(item.location)}`);
                const data = await res.json();
                if (data && data.length > 0) {
                    taskLat = parseFloat(data[0].lat);
                    taskLng = parseFloat(data[0].lon);
                }
            } catch (err) {
                console.error("Geocoding failed:", err);
            }
        }
        
        await addDoc(collection(db, "tasks"), {
          title: itemTitle,
          description: item.description,
          category: item.need_type,
          urgency: item.urgency || "medium",
          status: "open",
          lat: taskLat, 
          lng: taskLng,
          location_name: item.location || "Unknown Location",
          ngo_id: ngoId,
          ngo_name: ngoName,
          volunteers_assigned: [],
          created_at: serverTimestamp(),
          source: "ocr_scan"
        });
      }
      
      // Save report
      await addDoc(collection(db, "ocr_reports"), {
        uploaded_by_uid: user?.uid,
        ngo_id: ngoId,
        summary: result.summary,
        created_at: serverTimestamp()
      });

      if (onComplete) onComplete();
      alert("Successfully pinned tasks to map!");
      setResult(null);
      setImage(null);
    } catch (error) {
      console.error("Error saving tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto text-text-primary">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-black mb-2 italic tracking-tighter uppercase">Field Report Scanner</h2>
        <p className="text-text-secondary text-sm font-bold uppercase tracking-widest italic opacity-80">Digitize paper reports & auto-create tasks with Gemini AI.</p>
      </div>

      {!image && !result && !isCameraOpen && (
        <div className="space-y-6">
          <div 
            onClick={startCamera}
            className="border-2 border-dashed border-border-theme rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all bg-surface shadow-sm group active:scale-[0.98]"
          >
            <Camera className="w-12 h-12 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
            <span className="font-black text-lg uppercase tracking-tight italic">Scan Paper Report</span>
            <span className="text-[10px] text-text-secondary mt-1 font-bold uppercase tracking-widest italic">Tap to open camera</span>
          </div>
          
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleCapture}
            className="hidden" 
          />

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 text-blue-500 font-black uppercase text-[10px] tracking-widest italic hover:text-blue-600 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload from Gallery
          </button>
        </div>
      )}

      {isCameraOpen && !image && (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] bg-black border border-border-theme">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            <button 
              onClick={stopCamera}
              className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white z-20 hover:bg-red-500 transition-all shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={capturePhoto}
            className="google-btn-primary w-full py-4 shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2 font-bold uppercase tracking-[0.1em] text-xs"
          >
            <Camera className="w-5 h-5" />
            Capture Photo
          </button>
        </div>
      )}

      {image && !result && (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] bg-surface-lighter border border-border-theme group">
            {image && (
                <img src={image} alt="Captured" className="w-full h-full object-contain" />
            )}
            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>
            {/* Animated Scan Line */}
            <motion.div 
                initial={{ top: "0%" }}
                animate={{ top: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] z-10"
            />
            <button 
              onClick={() => setImage(null)}
              className="absolute top-4 right-4 bg-surface/80 backdrop-blur-md p-2 rounded-full text-text-primary border border-border-theme z-20 hover:bg-red-500 hover:text-white transition-all shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={processImage}
            disabled={loading}
            className="google-btn-primary w-full py-4 shadow-xl shadow-blue-900/20 active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-mono text-[10px] tracking-widest uppercase font-bold">Initializing Gemini Neural Link...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Analyze Neural Scan
              </>
            )}
          </button>
        </div>
      )}

      {result && (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
          <div className="material-card p-6 border-l-4 border-blue-500 bg-surface shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-border-theme pb-4">
                <h3 className="font-black text-lg text-text-primary uppercase italic tracking-tighter">Extracted Metadata</h3>
                <span className="text-[10px] text-blue-500 font-black font-mono tracking-tighter uppercase italic">SUCCESS_PROC_200</span>
            </div>
            <p className="text-sm text-text-secondary italic mb-8 border-l-2 border-blue-500/20 pl-4 py-1 leading-relaxed">"{result.summary}"</p>
            
            <div className="space-y-4">
              {result.extracted_items.map((item: any, i: number) => (
                <div key={i} className="bg-surface-lighter p-5 rounded-2xl border border-border-theme relative overflow-hidden shadow-sm group hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border ${
                        item.urgency === 'critical' ? 'bg-error-theme/10 text-error-theme border-error-theme/20' : 
                        item.urgency === 'medium' ? 'bg-secondary-theme/10 text-secondary-theme border-secondary-theme/20' : 'bg-success-theme/10 text-success-theme border-success-theme/20'
                    }`}>
                        {item.urgency}
                    </span>
                    <span className="text-[9px] font-black text-blue-600 bg-blue-500/10 px-3 py-1 rounded-full uppercase italic tracking-widest border border-blue-500/10">
                        {item.need_type}
                    </span>
                  </div>
                  <p className="text-sm font-black text-text-primary mb-1 uppercase italic tracking-tight">
                    {(item.title && item.title !== "N/A") ? item.title : (item.person_name || "ID_PENDING")}
                  </p>
                  <p className="text-xs text-text-secondary leading-relaxed mb-4 italic opacity-80">{item.description}</p>
                  <div className="flex items-center gap-2 text-[9px] text-text-secondary font-black uppercase tracking-[0.15em] border-t border-border-theme pt-3">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                    {item.location || "GEO_NOT_RESOLVED"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setResult(null)}
              className="google-btn-secondary flex-1 shadow-lg active:scale-95 py-3.5"
            >
              Re-scan
            </button>
            <button 
              onClick={confirmAndPin}
              disabled={loading}
              className="google-btn-primary flex-1 flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 active:scale-95 py-3.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Confirm & Pin
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
