// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCumZPkROu50U639mLIuRXfYoJgmMFy48g",
  authDomain: "easytrip-app-458618.firebaseapp.com",
  projectId: "easytrip-app-458618",
  storageBucket: "easytrip-app-458618.firebasestorage.app",
  messagingSenderId: "407665272181",
  appId: "1:407665272181:web:7c566e3066c285e9735f3c",
  measurementId: "G-LX9J5TNSWF"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);