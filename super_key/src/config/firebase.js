// src/config/firebase.js
const admin = require('firebase-admin');
require('dotenv').config();

let db;

try {
  if (!admin.apps.length) {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "super-key-4a382",
        clientEmail: "firebase-adminsdk-fbsvc@super-key-4a382.iam.gserviceaccount.com",
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }),
      databaseURL: "https://super-key-4a382-default-rtdb.firebaseio.com"
    });
    
    db = admin.firestore();
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

module.exports = { admin, db };