import { reactive } from 'vue';
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAnalytics, setAnalyticsCollectionEnabled, type Analytics } from 'firebase/analytics';
import {
  getAuth,
  onAuthStateChanged,
  connectAuthEmulator,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { logger } from '@/utils/logger';
// Define a comprehensive type for our reactive user state
type FireUser = {
  uid: string | null;
  loggedIn: boolean;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
};
// Use demo project for local development
const isLocalDevelopment =
  import.meta.env.DEV &&
  (!import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    import.meta.env.VITE_FIREBASE_PROJECT_ID === 'demo-project');

// Demo project configuration for local development
const demoConfig: FirebaseOptions = {
  apiKey: 'demo-key',
  authDomain: 'demo-project.firebaseapp.com',
  databaseURL: 'https://demo-project-default-rtdb.firebaseio.com',
  projectId: 'demo-project',
  storageBucket: 'demo-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:demo-app-id',
  measurementId: 'G-DEMO123', // Google Analytics
};
// Firebase configuration
const firebaseConfig: FirebaseOptions = isLocalDevelopment
  ? demoConfig
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    };
const measurementId = firebaseConfig.measurementId;

type WindowWithGaDisable = Window & typeof globalThis & {
  [key: `ga-disable-${string}`]: boolean;
};

const setGaTrackingEnabled = (enabled: boolean) => {
  if (!measurementId || typeof window === 'undefined') {
    return;
  }
  (window as WindowWithGaDisable)[`ga-disable-${measurementId}`] = !enabled;
};

setGaTrackingEnabled(false);

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const functions = getFunctions(app, 'us-central1');
const storage = getStorage(app);
// Set up a reactive object for our user state with comprehensive properties
const fireuser = reactive<FireUser>({
  uid: null,
  loggedIn: false,
  displayName: null,
  email: null,
  photoURL: null,
  emailVerified: false,
  phoneNumber: null,
  lastLoginAt: null,
  createdAt: null,
});
// Handle auth state changes with comprehensive user data
onAuthStateChanged(auth, (user: User | null) => {
  if (user) {
    fireuser.uid = user.uid;
    fireuser.loggedIn = true;
    fireuser.displayName = user.displayName;
    fireuser.email = user.email;
    fireuser.photoURL = user.photoURL;
    fireuser.emailVerified = user.emailVerified;
    fireuser.phoneNumber = user.phoneNumber;
    fireuser.lastLoginAt = user.metadata.lastSignInTime ?? null;
    fireuser.createdAt = user.metadata.creationTime ?? null;
  } else {
    // Reset all properties on logout
    Object.assign(fireuser, {
      uid: null,
      loggedIn: false,
      displayName: null,
      email: null,
      photoURL: null,
      emailVerified: false,
      phoneNumber: null,
      lastLoginAt: null,
      createdAt: null,
    });
  }
});
// Connect to emulators in development
if (isLocalDevelopment || ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(firestore, 'localhost', 5002);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (error) {
    logger.error('Error connecting to Firebase emulators:', error);
  }
}
let analyticsInstance: Analytics | undefined;

const ensureAnalytics = () => {
  if (!import.meta.env.PROD) {
    return undefined;
  }
  if (!analyticsInstance) {
    try {
      analyticsInstance = getAnalytics(app);
    } catch (error) {
      logger.error('Failed to initialize Firebase Analytics:', error);
      analyticsInstance = undefined;
    }
  }
  return analyticsInstance;
};

const enableAnalyticsCollection = async () => {
  if (!import.meta.env.PROD) {
    return undefined;
  }
  setGaTrackingEnabled(true);
  const instance = ensureAnalytics();
  if (instance) {
    try {
      setAnalyticsCollectionEnabled(instance, true);
    } catch (error) {
      logger.error('Unable to enable Firebase Analytics collection:', error);
    }
  }
  return instance;
};

const disableAnalyticsCollection = () => {
  setGaTrackingEnabled(false);
  if (analyticsInstance) {
    try {
      setAnalyticsCollectionEnabled(analyticsInstance, false);
    } catch (error) {
      logger.error('Unable to disable Firebase Analytics collection:', error);
    }
  }
};

export {
  app,
  auth,
  firestore,
  functions,
  storage,
  fireuser,
  GoogleAuthProvider,
  GithubAuthProvider,
  httpsCallable,
  signOut,
  signInWithPopup,
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  enableAnalyticsCollection,
  disableAnalyticsCollection,
};
