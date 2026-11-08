import { isFirebaseConfigured, db, ensureAnonymousSession, collection, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "./firebase.js";

const safeLog = (message, error) => console.warn(`[PHY tools] ${message}`, error || "");
let heartbeatId = null;
async function updatePresence(uid) {
  const now = serverTimestamp();
  const visitorRef = doc(db, "siteVisitors", uid);
  const visitorSnap = await getDoc(visitorRef);
  if (visitorSnap.exists()) await updateDoc(visitorRef, { lastSeenAt: now });
  else await setDoc(visitorRef, { firstSeenAt: now, lastSeenAt: now });

  const presenceRef = doc(db, "sitePresence", uid);
  const presenceSnap = await getDoc(presenceRef);
  const page = location.pathname + location.hash;
  if (presenceSnap.exists()) await updateDoc(presenceRef, { lastSeenAt: serverTimestamp(), page });
  else await setDoc(presenceRef, { firstSeenAt: serverTimestamp(), lastSeenAt: serverTimestamp(), page });
}

async function bootPublicLibrary() {
  if (!isFirebaseConfigured || !db) return; // Built-in simulations remain fully available without Firebase.
  try {
    const user = await ensureAnonymousSession();
    if (!user) return;
    try { await updatePresence(user.uid); } catch (e) { safeLog("Visitor counter unavailable; built-in tools remain available.", e); }
    heartbeatId = window.setInterval(() => updatePresence(user.uid).catch(e => safeLog("Presence refresh failed.", e)), 30000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) updatePresence(user.uid).catch(e => safeLog("Presence refresh failed.", e)); });

    const [unitSnap, toolSnap] = await Promise.all([
      getDocs(collection(db, "units")),
      getDocs(collection(db, "customTools"))
    ]);
    const units = unitSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const tools = toolSnap.docs.map(d => ({ id: d.id, ...d.data(), custom: true }));
    window.PHY_MERGE_REMOTE_DATA?.(units, tools);
  } catch (error) {
    safeLog("Could not load administrator-added units/tools. Built-in tools are not affected.", error);
  }
}

window.PHY_LOAD_CUSTOM_TOOL = async (id) => {
  try {
    if (!db) throw new Error("Firebase is not configured.");
    const [metaSnap, fileSnap] = await Promise.all([getDoc(doc(db, "customTools", id)), getDoc(doc(db, "customToolFiles", id))]);
    if (!metaSnap.exists() || !fileSnap.exists()) throw new Error("This uploaded simulation is unavailable.");
    const meta = { id, ...metaSnap.data() };
    const source = fileSnap.data()?.html;
    if (typeof source !== "string" || !source.trim()) throw new Error("The simulation HTML is empty.");
    window.PHY_OPEN_CUSTOM_TOOL?.(meta, source);
  } catch (error) {
    console.error(error);
    alert(error.message || "Could not open this simulation. Check your internet connection.");
  }
};

bootPublicLibrary();
