import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from './firebaseConfig';
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
let instance;
try { instance = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
catch (error) { if (error.code !== 'auth/already-initialized') throw error; instance = getAuth(app); }
export const auth = instance;
export const db = getFirestore(app);
