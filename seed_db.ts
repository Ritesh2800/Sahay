import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

const ngos = [
  {
    name: "Pune Food Relief Foundation",
    description: "Emergency food packets and clean water distribution",
    category: "Food Relief",
    address: "FC Road, Shivajinagar, Pune",
    lat: 18.5314,
    lng: 73.8446,
    impact_credits: 120,
    admin_uid: "system",
    member_count: 0,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    name: "Sahyadri Medical Corps",
    description: "Free medical camps, first aid, and medicine distribution",
    category: "Medical Aid",
    address: "Deccan Gymkhana, Pune",
    lat: 18.5195,
    lng: 73.8553,
    impact_credits: 85,
    admin_uid: "system",
    member_count: 0,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    name: "Shelter First Pune",
    description: "Emergency shelter, tarpaulin distribution, temporary housing",
    category: "Shelter",
    address: "Kothrud, Pune",
    lat: 18.5074,
    lng: 73.8077,
    impact_credits: 60,
    admin_uid: "system",
    member_count: 0,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    name: "Kasba Rescue Network",
    description: "Search and rescue coordination and missing person tracking",
    category: "Rescue & Safety",
    address: "Kasba Peth, Pune",
    lat: 18.5167,
    lng: 73.8562,
    impact_credits: 200,
    admin_uid: "system",
    member_count: 0,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    name: "Digital Sewa Initiative",
    description: "Tech and communication support for relief operations",
    category: "Logistics & Tech",
    address: "Baner, Pune",
    lat: 18.5590,
    lng: 73.7868,
    impact_credits: 40,
    admin_uid: "system",
    member_count: 0,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  }
];

async function seed() {
  console.log("Seeding NGOs...");
  for (const ngo of ngos) {
    const q = await db.collection("ngos").where("name", "==", ngo.name).get();
    if (q.empty) {
      await db.collection("ngos").add(ngo);
      console.log(`Added NGO: ${ngo.name}`);
    } else {
      console.log(`NGO already exists: ${ngo.name}`);
    }
  }
  console.log("Seeding complete.");
}

seed().catch(console.error);
