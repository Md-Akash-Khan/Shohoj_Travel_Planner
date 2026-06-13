import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBpEfgwJjXDa3LQwwpz1rE0xItnvfXlCPw",
  authDomain: "shohoj-travel-planner-993d7.firebaseapp.com",
  projectId: "shohoj-travel-planner-993d7",
  storageBucket: "shohoj-travel-planner-993d7.firebasestorage.app",
  messagingSenderId: "650597766923",
  appId: "1:650597766923:web:96bfe9b771342e74a3f40e"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
