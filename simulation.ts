import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, addDoc, collection, serverTimestamp, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
    console.log("Signing in...")
    await signInAnonymously(auth);
    console.log("User:", auth.currentUser?.uid);
    try {
        console.log("Writing join request...");
        await addDoc(collection(db, "join_requests"), {
            user_id: auth.currentUser?.uid || "unknown",
            user_name: "Test User",
            ngo_id: "habitat-humanity",
            ngo_name: "Habitat",
            status: "pending",
            created_at: serverTimestamp()
        });
        console.log("Success addDoc!");
    } catch(e: any) {
        console.error("Error addDoc:", e.message);
    }
    
    // Simulate setting NGO Admin
    try {
        await setDoc(doc(db, "users", auth.currentUser!.uid), {
            uid: auth.currentUser!.uid,
            role: "ngo_admin",
            ngo_id: "habitat-humanity",
            email: "test@habitat.org",
            onboarded: true
        });
    } catch (e: any) {
        console.error("Error setting user:", e.message);
    }

    try {
        console.log("Querying join requests...");
        const q = query(collection(db, "join_requests"), where("ngo_id", "==", "habitat-humanity"), where("status", "==", "pending"));
        const snap = await getDocs(q);
        console.log("Queried docs size:", snap.size);
    } catch(e: any) {
        console.error("Error getDocs:", e.message);
    }
    process.exit(0);
}
run();
