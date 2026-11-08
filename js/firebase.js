import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { firebaseConfig, adminEmail } from "./firebase-config.js";

const required = ["apiKey", "authDomain", "projectId", "messagingSenderId", "appId"];
export const isFirebaseConfigured = required.every(k => typeof firebaseConfig[k] === "string" && firebaseConfig[k].trim() && !firebaseConfig[k].startsWith("YOUR_"));
export const app = isFirebaseConfigured ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// Analytics is optional. It is skipped automatically where the browser does not support it.
export const analyticsReady = app ? analyticsIsSupported().then(ok => ok ? getAnalytics(app) : null).catch(() => null) : Promise.resolve(null);

export function isAdminUser(user) {
  return !!user && String(user.email || "").toLowerCase() === adminEmail.toLowerCase() && user.emailVerified === true;
}
export function watchAuth(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback, error => console.error("Firebase auth state:", error));
}
export async function waitForAuthState() {
  if (!auth) return null;
  return new Promise((resolve, reject) => {
    let stop = () => {};
    stop = onAuthStateChanged(auth, user => { stop(); resolve(user); }, error => { stop(); reject(error); });
  });
}
export async function ensureAnonymousSession() {
  if (!auth) throw new Error("Firebase is not configured.");
  const existing = await waitForAuthState();
  if (existing) return existing;
  const result = await signInAnonymously(auth);
  return result.user;
}
export async function signInGoogle() {
  if (!auth) throw new Error("Firebase is not configured. Check js/firebase-config.js.");
  try { const result = await signInWithPopup(auth, provider); return result.user; }
  catch (error) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(error.code)) {
      await signInWithRedirect(auth, provider); return null;
    }
    throw error;
  }
}
export async function finishGoogleRedirect() {
  if (!auth) return null;
  const result = await getRedirectResult(auth);
  return result?.user || null;
}
export async function signOutUser() { if (auth) await signOut(auth); }
export { doc, setDoc, getDoc, getDocs, collection, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, onAuthStateChanged };
