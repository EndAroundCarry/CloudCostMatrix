import { Injectable, signal, computed } from '@angular/core';
import type { Auth, AuthError, User } from 'firebase/auth';
import { IAuthService, AppUser } from '../../core/repositories/auth.service.interface';
import { getFirebaseApp } from './firebase-app';

/**
 * `firebase/auth` is imported dynamically (see load()) so the ~90 kB SDK is not
 * part of the initial bundle. Every visitor used to pay that cost eagerly while
 * ~99% never sign in — the same rationale the estimate repository documents for
 * its Firestore imports. Type-only imports above are erased at build time and
 * create no runtime dependency.
 */
type FirebaseAuthModule = typeof import('firebase/auth');

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
  private auth: Auth | null = null;
  private loadPromise: Promise<FirebaseAuthModule> | null = null;

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

  /**
   * Lazily loads the Firebase Auth SDK and wires the auth-state listener on
   * first use. Idempotent — concurrent callers share one import.
   */
  private load(): Promise<FirebaseAuthModule> {
    if (!this.loadPromise) {
      this.loadPromise = import('firebase/auth')
        .then((mod) => {
          const auth = mod.getAuth(getFirebaseApp());
          this.auth = auth;
          // Bootstraps currentUser on load and keeps it in sync with sign-out
          // or cross-tab changes. NOT sufficient on its own: Firebase only
          // fires this when the signed-in UID itself changes, so linking a
          // credential onto an existing anonymous user (same UID) never
          // re-triggers it — every method below also applies its own result
          // directly for that reason.
          mod.onAuthStateChanged(auth, (user) => {
            const mapped = user ? mapUser(user) : null;
            this._currentUser.set(mapped);
            if (!this.readyResolved) {
              this.readyResolved = true;
              this.resolveReady(mapped);
            }
          });
          return mod;
        })
        .catch((err) => {
          // A failed chunk load must not leave whenReady() pending forever, and
          // must be retryable by the next user action rather than cached.
          this.loadPromise = null;
          if (!this.readyResolved) {
            this.readyResolved = true;
            this.resolveReady(null);
          }
          throw err;
        });
    }
    return this.loadPromise;
  }

  private requireAuth(): Auth {
    if (!this.auth) throw new Error('Firebase Auth is not initialized yet.');
    return this.auth;
  }

  public whenReady(): Promise<AppUser | null> {
    // Kicking the import off here (rather than in the constructor) is what
    // keeps firebase/auth off the critical path: EstimatorStore calls this from
    // afterNextRender(), so the SDK downloads after the first paint.
    void this.load().catch(() => undefined);
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
    const { signInAnonymously: fbSignInAnonymously } = await this.load();
    const cred = await fbSignInAnonymously(this.requireAuth());
    return this.applyUser(cred.user);
  }

  public async signInWithGoogle(): Promise<AppUser> {
    this._authError.set(null);
    const { GoogleAuthProvider, linkWithPopup, signInWithPopup, signInWithCredential } = await this.load();
    const auth = this.requireAuth();
    const provider = new GoogleAuthProvider();
    const current = auth.currentUser;
    try {
      if (current?.isAnonymous) {
        const result = await linkWithPopup(current, provider);
        return this.applyUser(result.user);
      }
      const result = await signInWithPopup(auth, provider);
      return this.applyUser(result.user);
    } catch (err) {
      const code = (err as AuthError)?.code;
      // The anonymous session's Google identity is already a real account elsewhere —
      // sign into that existing account instead of failing outright.
      if (code === 'auth/credential-already-in-use') {
        const credential = GoogleAuthProvider.credentialFromError(err as AuthError);
        if (credential) {
          const result = await signInWithCredential(auth, credential);
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
      const { signInWithEmailAndPassword } = await this.load();
      const cred = await signInWithEmailAndPassword(this.requireAuth(), email, password);
      return this.applyUser(cred.user);
    } catch (err) {
      this._authError.set(mapAuthError(err));
      throw err;
    }
  }

  public async signUpWithEmail(email: string, password: string, displayName?: string): Promise<AppUser> {
    this._authError.set(null);
    try {
      const { EmailAuthProvider, createUserWithEmailAndPassword, linkWithCredential, updateProfile } =
        await this.load();
      const auth = this.requireAuth();
      const current = auth.currentUser;
      let user: User;
      if (current?.isAnonymous) {
        const credential = EmailAuthProvider.credential(email, password);
        const result = await linkWithCredential(current, credential);
        user = result.user;
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
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
      const { sendPasswordResetEmail } = await this.load();
      await sendPasswordResetEmail(this.requireAuth(), email);
    } catch (err) {
      this._authError.set(mapAuthError(err));
      throw err;
    }
  }

  public async signOut(): Promise<void> {
    const { signOut: fbSignOut } = await this.load();
    await fbSignOut(this.requireAuth());
    this._currentUser.set(null);
  }
}
