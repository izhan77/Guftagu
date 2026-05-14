// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDwbVoxfWL7RLkakWtKFt7TzJ9jcT_sNFA",
  authDomain: "guftagu-879bb.firebaseapp.com",
  projectId: "guftagu-879bb",
  storageBucket: "guftagu-879bb.firebasestorage.app",
  messagingSenderId: "148691517826",
  appId: "1:148691517826:web:84cc9853668f1b3760cf9b",
  measurementId: "G-W38CM7LFYN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const persistence = getReactNativePersistence(ReactNativeAsyncStorage);

export const auth = initializeAuth(app, {
  persistence
});
const analytics = getAnalytics(app);