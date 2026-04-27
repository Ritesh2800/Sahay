import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
    await signInAnonymously(auth);
    const docSnap = await getDoc(doc(db, "users", "nTXU1GvSbNhG79YW25k1RmNtmhn2"));
    console.log("Ritesh User:", docSnap.data());
    process.exit(0);
}
run();
