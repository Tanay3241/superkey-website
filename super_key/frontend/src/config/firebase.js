// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, inMemoryPersistence } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyBka4Y0wKLdUAezeemKmkAuDD9wAQ2z9Ks",
  authDomain: "super-key-4a382.firebaseapp.com",
  projectId: "super-key-4a382",
  // ...other config from Firebase Console
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistence to in-memory (no local/session storage)
setPersistence(auth, inMemoryPersistence);

export { auth };