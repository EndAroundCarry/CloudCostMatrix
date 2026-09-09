import { Injectable, signal, computed } from '@angular/core';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously as fbSignInAnonymously,
  signInWithPopup,
  signInWithCredential,
  linkWithPopup,
  linkWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
  GoogleAuthProvider,
  EmailAuthProvider,
  Auth,
  AuthError,
  User
} from 'firebase/auth';
import { IAuthService, AppUser } from '../../core/repositories/auth.service.interface';
import { getFirebaseApp } from './firebase-app';

function mapUser(user: User): AppUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous
  };
}

function mapAuthError(err: unknown): string {
  const code = (err as AuthError)?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email — try signing in instead.';
    case 'auth/weak-password':
      return 'Choose a password with at least 6 characters.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Please allow popups and try again.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return 'Something went wrong signing you in. Please try again.';
  }
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService implements IAuthService {
  private readonly auth: Auth = getAuth(getFirebaseApp());

  private readonly _currentUser = signal<AppUser | null>(null);
  private readonly _authError = signal<string | null>(null);

  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = computed(() => this._currentUser() !== null);
  public readonly isAnonymous = computed(() => this._currentUser()?.isAnonymous ?? true);
  public readonly authError = this._authError.asReadonly();

  private readyResolved = false;
  private resolveReady!: (user: AppUser | null) => void;
  private readonly readyPromise = new Promise<AppUser | null>((resolve) => {
    this.resolveReady = resolve;
  });

  constructor() {
    // Bootstraps currentUser on load and keeps it in sync with sign-out or
    // cross-tab changes. NOT sufficient on its own: Firebase only fires this
    // when the signed-in UID itself changes, so linking a credential onto an
    // existing anonymous user (same UID) never re-triggers it — every method
    // below also applies its own result directly for that reason.
    onAuthStateChanged(this.auth, (user) => {
      const mapped = user ? mapUser(user) : null;
      this._currentUser.set(mapped);
      if (!this.readyResolved) {
        this.readyResolved = true;
        this.resolveReady(mapped);
      }
    });
  }

  public whenReady(): Promise<AppUser | null> {
    return this.readyPromise;
  }

  public clearAuthError(): void {
    this._authError.set(null);
  }

  private applyUser(user: User): AppUser {
    const mapped = mapUser(user);
    this._currentUser.set(mapped);
    return mapped;
  }

  public async signInAnonymously(): Promise<AppUser> {
    const cred = await fbSignInAnonymously(this.auth);
    return this.applyUser(cred.user);
  }

  public async signInWithGoogle(): Promise<AppUser> {
    this._authError.set(null);
    const provider = new GoogleAuthProvider();
    const current = this.auth.currentUser;
    try {
      if (current?.isAnonymous) {
        const result = await linkWithPopup(current, provider);
        return this.applyUser(result.user);
      }
      const result = await signInWithPopup(this.auth, provider);
      return this.applyUser(result.user);
    } catch (err) {
      const code = (err as AuthError)?.code;
      // The anonymous session's Google identity is already a real account elsewhere —
      // sign into that existing account instead of failing outright.
      if (code === 'auth/credential-already-in-use') {
        const credential = GoogleAuthProvider.credentialFromError(err as AuthError);
        if (credential) {
          const result = await signInWithCredential(this.auth, credential);
          return this.applyUser(result.user);
        }
      }
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        this._authError.set(mapAuthError(err));
      }
      throw err;
    }
  }

  public async signInWithEmail(email: string, password: string): Promise<AppUser> {
    this._authError.set(null);
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      return this.applyUser(cred.user);
    } catch (err) {
      this._authError.set(mapAuthError(err));
      throw err;
    }
  }

  public async signUpWithEmail(email: string, password: string, displayName?: string): Promise<AppUser> {
    this._authError.set(null);
    try {
      const current = this.auth.currentUser;
      let user: User;
      if (current?.isAnonymous) {
        const credential = EmailAuthProvider.credential(email, password);
        const result = await linkWithCredential(current, credential);
        user = result.user;
      } else {
        const result = await createUserWithEmailAndPassword(this.auth, email, password);
        user = result.user;
      }
      if (displayName?.trim()) {
        await updateProfile(user, { displayName: displayName.trim() });
      }
      return this.applyUser(user);
    } catch (err) {
      this._authError.set(mapAuthError(err));
      throw err;
    }
  }

  public async sendPasswordReset(email: string): Promise<void> {
    this._authError.set(null);
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (err) {
      this._authError.set(mapAuthError(err));
      throw err;
    }
  }

  public async signOut(): Promise<void> {
    await fbSignOut(this.auth);
    this._currentUser.set(null);
  }
}
