import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, query, collection, where, getDocs, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
    await signInAnonymously(auth);
    
    // Set the user document
    await setDoc(doc(db, "users", auth.currentUser!.uid), {
        uid: auth.currentUser!.uid,
        role: "ngo_admin",
        ngo_id: "habitat-humanity",
        email: "test@habitat.org",
        onboarded: true
    });

    try {
        const q = query(collection(db, "join_requests"), where("ngo_id", "==", "habitat-humanity"));
        const snap = await getDocs(q);
        console.log("Success with where! Docs:", snap.size);
    } catch (e: any) {
        console.error("Error with where:", e.message);
    }
    process.exit(0);
}
run();
