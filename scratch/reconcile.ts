import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

async function run() {
  console.log("🚀 Starting financial reconciliation for completed orders...");
  
  // Read firebase config
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf8'));
  
  // Initialize Firebase Admin
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  let credential;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  } else if (existsSync(serviceAccountPath)) {
    credential = admin.credential.cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8')));
  } else {
    // Try Application Default Credentials
    try {
      credential = admin.credential.applicationDefault();
    } catch (e) {
      console.error("❌ No valid credentials found (no service-account.json or env variable).");
      return;
    }
  }

  admin.initializeApp({
    credential,
    projectId: firebaseConfig.projectId,
  });

  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const db = admin.firestore();
  // If custom database is set, configure it
  if (databaseId !== '(default)') {
    // Firestore in older firebase-admin might not support db.settings({databaseId}) directly,
    // but we can access it or use the default database. Let's try setting it:
    try {
      db.settings({ databaseId });
    } catch (e) {
      console.warn("⚠️ Database ID setting warning:", e.message);
    }
  }

  console.log(`📡 Connected to database: "${databaseId}"`);

  // Query all completed orders
  const ordersSnap = await db.collection('orders')
    .where('status', '==', 'completed')
    .get();

  console.log(`🔍 Found ${ordersSnap.size} completed orders in database.`);
  
  let reconciledCount = 0;

  for (const doc of ordersSnap.docs) {
    const orderData = doc.data();
    const orderId = doc.id;
    
    // Check if balance has already been marked as released
    if (orderData.isBalanceReleased === true) {
      console.log(`ℹ️ Order #${orderId} ("${orderData.title}") is already reconciled. Skipping.`);
      continue;
    }

    const sellerId = orderData.sellerId;
    const amount = orderData.amount;
    const sellerNetShare = orderData.paymentFees?.sellerNetShare || amount;

    if (!sellerId || sellerId === 'unknown') {
      console.warn(`⚠️ Order #${orderId} has no valid sellerId: "${sellerId}". Skipping.`);
      continue;
    }

    console.log(`💸 Reconciling Order #${orderId} ("${orderData.title}"):`);
    console.log(`   - Seller UID: ${sellerId}`);
    console.log(`   - Order Amount: ${amount} SAR`);
    console.log(`   - Seller Net Share: ${sellerNetShare} SAR`);

    // Retrieve seller profile
    const sellerRef = db.collection('users').doc(sellerId);
    const sellerSnap = await sellerRef.get();
    
    if (!sellerSnap.exists) {
      console.warn(`   ❌ Seller profile not found in database! Skipping.`);
      continue;
    }

    const sellerData = sellerSnap.data() || {};
    const oldBalance = sellerData.balance || 0;
    const newBalance = oldBalance + sellerNetShare;

    console.log(`   - Current Balance: ${oldBalance} SAR`);
    console.log(`   - Updating Balance to: ${newBalance} SAR`);

    // Perform database transaction or updates
    const batch = db.batch();
    
    // 1. Increment seller's balance
    batch.update(sellerRef, {
      balance: admin.firestore.FieldValue.increment(sellerNetShare),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Mark order as balance released
    batch.update(doc.ref, {
      isBalanceReleased: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    console.log(`   ✅ Successfully reconciled and updated balance for seller ${sellerId}!`);
    reconciledCount++;
  }

  console.log(`\n🎉 Reconciliation completed successfully! Reconciled ${reconciledCount} orders.`);
}

run().catch(console.error);
