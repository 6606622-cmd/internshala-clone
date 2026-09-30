// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth, GoogleAuthProvider } from "firebase/auth";
 // Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAh9bLOjaKbmj7FSKWq8K2a-TE9IvBXl2A",
  authDomain: "internarea-f22d8.firebaseapp.com",
  projectId: "internarea-f22d8",
  storageBucket: "internarea-f22d8.firebasestorage.app",
  messagingSenderId: "525710116189",
  appId: "1:525710116189:web:9e8b7adc19a2c81bf4d4b4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export{ auth, provider };