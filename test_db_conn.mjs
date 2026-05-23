import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function run() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  let credential;
  
  if (fs.existsSync('./service-account.json')) {
    credential = cert(JSON.parse(fs.readFileSync('./service-account.json', 'utf8')));
  } else {
    console.log("No service-account.json");
    return;
  }

  const app = initializeApp({ credential, projectId: config.projectId });
  
  // Method 1: Using db.settings
  try {
    const db1 = getFirestore(app);
    db1.settings({ databaseId: config.firestoreDatabaseId });
    const snap = await db1.collection('notifications').limit(1).get();
    console.log("Method 1 (settings):", snap.size);
  } catch(e) {
    console.error("Method 1 failed:", e.message);
  }

  // Method 2: Using getFirestore with databaseId
  try {
    const db2 = getFirestore(app, config.firestoreDatabaseId);
    const snap = await db2.collection('notifications').limit(1).get();
    console.log("Method 2 (getFirestore):", snap.size);
  } catch(e) {
    console.error("Method 2 failed:", e.message);
  }
}

run().catch(console.error);
