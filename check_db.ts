import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
    await signInAnonymously(auth);
    const snap = await getDocs(collection(db, "join_requests"));
    console.log("All join_requests:", snap.docs.map(d => d.data()));
    process.exit(0);
}
run();
