/**
 * Firebase Initialization and Cloud Sync Helpers
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch, increment, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CONFIGURACIÓN DE FIREBASE - RELLENA CON TUS PROPIAS LLAVES
const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "TU_AUTH_DOMAIN_AQUI",
    projectId: "TU_PROJECT_ID_AQUI",
    storageBucket: "TU_STORAGE_BUCKET_AQUI",
    messagingSenderId: "TU_MESSAGING_SENDER_ID_AQUI",
    appId: "TU_APP_ID_AQUI",
    measurementId: "TU_MEASUREMENT_ID_AQUI"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Make auth functions globally available for the main app
window.firebaseAuth = auth;
window.firebaseDb = db;
window.googleProvider = googleProvider;
window.githubProvider = githubProvider;
window.signInWithGoogle = () => signInWithPopup(auth, googleProvider);
window.signInWithGithub = () => signInWithPopup(auth, githubProvider);
window.signOutFirebase = () => signOut(auth);
window.onFirebaseAuthStateChanged = (callback) => onAuthStateChanged(auth, callback);

// --- Cloud Sync Logic ---

/**
 * Save all notes to Firestore for a user
 */
window.saveNotesToCloud = async (userId, notes) => {
    if (!userId) return false;
    try {
        const userNotesRef = doc(db, 'users', userId);
        await setDoc(userNotesRef, {
            notes: notes,
            lastUpdated: new Date().toISOString(),
            noteCount: notes.length
        }, { merge: true });
        return true;
    } catch (error) {
        console.error('Error saving notes to cloud:', error);
        return false;
    }
};

/**
 * Load notes from Firestore for a user
 */
window.loadNotesFromCloud = async (userId) => {
    if (!userId) return null;
    try {
        const userNotesRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userNotesRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.notes || [];
        }
        return [];
    } catch (error) {
        console.error('Error loading notes from cloud:', error);
        return null;
    }
};

/**
 * Merge local and cloud notes
 */
window.mergeNotes = (localNotes, cloudNotes) => {
    if (!cloudNotes || cloudNotes.length === 0) return localNotes;
    if (!localNotes || localNotes.length === 0) return cloudNotes;

    const merged = new Map();
    cloudNotes.forEach(note => merged.set(note.id, note));

    const RESURRECTION_THRESHOLD = 24 * 60 * 60 * 1000;
    const now = Date.now();

    localNotes.forEach(note => {
        if (!merged.has(note.id)) {
            const lastUpdate = new Date(note.updatedAt || 0).getTime();
            if ((now - lastUpdate) < RESURRECTION_THRESHOLD) {
                merged.set(note.id, note);
            }
        } else {
            const cloudNote = merged.get(note.id);
            const localDate = new Date(note.updatedAt || 0);
            const cloudDate = new Date(cloudNote.updatedAt || 0);
            if (localDate > cloudDate) {
                merged.set(note.id, note);
            }
        }
    });

    return Array.from(merged.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

/**
 * Publish a note publicly
 */
window.publishNotePublicly = async (note) => {
    try {
        const publicRef = doc(collection(db, 'public_notes'));
        const publicData = {
            title: note.title,
            content: note.content,
            createdAt: new Date().toISOString(),
            theme: note.theme || 'none',
            customBgColor: note.customBgColor || null
        };
        await setDoc(publicRef, publicData);
        return publicRef.id;
    } catch (error) {
        console.error("Error publishing note:", error);
        return null;
    }
};

/**
 * Load a public note
 */
window.loadPublicNote = async (publicId) => {
    try {
        const docRef = doc(db, 'public_notes', publicId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error loading public note:", error);
        return null;
    }
};

// --- Stats and Install Tracking ---

window.addEventListener('appinstalled', async () => {
    try {
        const statsRef = doc(db, 'stats', 'general');
        try {
            await updateDoc(statsRef, { installs: increment(1) });
        } catch (e) {
            if (e.code === 'not-found') {
                await setDoc(statsRef, { installs: 1, created_at: new Date().toISOString() });
            }
        }
    } catch (err) {
        console.warn('Install tracker error:', err);
    }
});

// --- Real-time Sync ---

let _unsubscribeSync = null;
let _lastLocalSaveTimestamp = 0;

window.listenToCloudChanges = (userId, onNotesChanged) => {
    if (!userId) return () => { };
    if (_unsubscribeSync) _unsubscribeSync();

    const userNotesRef = doc(db, 'users', userId);
    _unsubscribeSync = onSnapshot(userNotesRef, (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        const cloudTimestamp = data.lastUpdated || '';
        const cloudTime = new Date(cloudTimestamp).getTime();
        if (Math.abs(cloudTime - _lastLocalSaveTimestamp) < 2000) return;

        if (onNotesChanged && data.notes) {
            onNotesChanged(data.notes, cloudTimestamp);
        }
    });
    return _unsubscribeSync;
};

window.stopCloudListener = () => {
    if (_unsubscribeSync) {
        _unsubscribeSync();
        _unsubscribeSync = null;
    }
};

window.markLocalSave = () => {
    _lastLocalSaveTimestamp = Date.now();
};

window.firebaseReady = true;
window.dispatchEvent(new Event('firebaseReady'));
