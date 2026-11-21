import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInAnonymously } from 'firebase/auth';
import { collection, doc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const CACHE = 'suit-sprint-results-v1';
let signingIn;
let writes = Promise.resolve();
async function user() {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  if (!signingIn) signingIn = signInAnonymously(auth).finally(() => { signingIn = null; });
  return (await signingIn).user;
}
export async function localHistory() {
  try { return JSON.parse(await AsyncStorage.getItem(CACHE) || '[]'); } catch { return []; }
}
export function storeLocal(result) {
  writes = writes.catch(() => {}).then(async () => {
    const old = await localHistory();
    const next = [result, ...old.filter((r) => r.id !== result.id)].sort((a, b) => b.completedAt - a.completedAt).slice(0, 200);
    await AsyncStorage.setItem(CACHE, JSON.stringify(next));
    return next;
  });
  return writes;
}
export async function syncHistory() {
  const account = await user();
  const cached = await localHistory();
  for (const item of cached.filter((r) => !r.synced)) {
    const { synced, ...data } = item;
    await setDoc(doc(db, 'players', account.uid, 'matches', item.id), data);
    await storeLocal({ ...item, synced: true });
  }
  const snapshot = await getDocs(query(collection(db, 'players', account.uid, 'matches'), orderBy('completedAt', 'desc'), limit(100)));
  for (const row of snapshot.docs) await storeLocal({ ...row.data(), id: row.id, synced: true });
  return localHistory();
}
export function historyError(error) {
  if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found') return 'Enable Anonymous sign-in in Firebase Authentication, then retry.';
  if (error.code === 'permission-denied') return 'Firestore access is denied. Verify the project security rules, then retry.';
  return 'Cloud sync is unavailable. Your results are saved on this device. Tap Retry to sync again.';
}
