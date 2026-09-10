import { Injectable, signal, computed } from '@angular/core';
import { IAuthService, AppUser } from '../../core/repositories/auth.service.interface';

/**
 * Server-only stand-in for FirebaseAuthService, bound in app.config.server.ts.
 *
 * FirebaseAuthService calls `getAuth()` as a field initializer and fires
 * `onAuthStateChanged` from its constructor — both execute the moment the
 * class is instantiated, on every prerendered route, since it's root-provided
 * and transitively injected by EstimatorStore. Rather than touch that class
 * (app.config.ts already documents the DI token as the intended swap seam:
 * "Clean Architecture: Swap with DotNet repositories anytime"), the server
 * config binds this instead.
 *
 * The one behavior that matters: `whenReady()` must resolve `null`
 * IMMEDIATELY. With the real service, on the server that promise would never
 * resolve (nothing ever fires onAuthStateChanged in Node), which would hang
 * EstimatorStore.restoreSavedEstimates() forever. Resolving null lets it fall
 * through to that method's own `typeof window !== 'undefined'` guard and stop
 * cleanly — no anonymous sign-in, no localStorage, no Firestore, and
 * `firebase/auth` never even executes in the server bundle.
 */
@Injectable()
export class NoopAuthService implements IAuthService {
  private readonly _currentUser = signal<AppUser | null>(null);
  private readonly _authError = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => false);
  readonly isAnonymous = computed(() => true);
  readonly authError = this._authError.asReadonly();

  whenReady(): Promise<AppUser | null> {
    return Promise.resolve(null);
  }

  clearAuthError(): void {
    this._authError.set(null);
  }

  private unavailable(): never {
    throw new Error('Authentication is unavailable during server-side prerendering.');
  }

  signInAnonymously(): Promise<AppUser> {
    return Promise.reject(this.unavailable());
  }

  signInWithGoogle(): Promise<AppUser> {
    return Promise.reject(this.unavailable());
  }

  signInWithEmail(): Promise<AppUser> {
    return Promise.reject(this.unavailable());
  }

  signUpWithEmail(): Promise<AppUser> {
    return Promise.reject(this.unavailable());
  }

  sendPasswordReset(): Promise<void> {
    return Promise.reject(this.unavailable());
  }

  signOut(): Promise<void> {
    return Promise.resolve();
  }
}
