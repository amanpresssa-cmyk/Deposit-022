const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function run() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  let credential;
  
  if (fs.existsSync('./service-account.json')) {
    credential = cert(JSON.parse(fs.readFileSync('./service-account.json', 'utf8')));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  } else {
    const { applicationDefault } = require('firebase-admin/app');
    credential = applicationDefault();
  }

  initializeApp({ credential, projectId: config.projectId });
  
  const db = getFirestore();
  db.settings({ databaseId: config.firestoreDatabaseId || '(default)' });

  console.log('--- RECENT NOTIFICATIONS ---');
  const snap = await db.collection('notifications').orderBy('createdAt', 'desc').limit(5).get();
  snap.forEach(doc => {
    const d = doc.data();
    console.log(`[${doc.id}] To: ${d.userId} | Processed: ${d.whatsappProcessed} | Title: ${d.title}`);
  });

  console.log('\n--- TARGET USERS FOR RECENT NOTIFS ---');
  const userIds = [...new Set(snap.docs.map(d => d.data().userId))];
  for (const uid of userIds) {
    if (uid === 'ADMIN') continue;
    const uSnap = await db.collection('users').doc(uid).get();
    if (uSnap.exists) {
      const u = uSnap.data();
      console.log(`User ${uid} => Name: ${u.displayName}, WhatsApp Enabled: ${u.whatsappEnabled}, Number: ${u.whatsappNumber}`);
    } else {
      console.log(`User ${uid} => NOT FOUND`);
    }
  }
}

run().catch(console.error);
