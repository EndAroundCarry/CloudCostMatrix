import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './firebase.config';

let app: FirebaseApp | null = null;

/** Returns the single shared Firebase app instance, initializing it on first use. */
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}
