import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EstimatorStore } from '../../state/estimator.store';
import { AUTH_SERVICE_TOKEN } from '../../core/repositories/auth.service.interface';

type AuthMode = 'signin' | 'signup';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  template: `
    @if (store.isAuthModalOpen()) {
      <div class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" (click)="close()"></div>

      <div class="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
        <div class="relative w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl pointer-events-auto" role="dialog" aria-modal="true" aria-label="Sign in">

          <button type="button" (click)="close()"
            class="absolute top-4 right-4 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer" aria-label="Close">
            <mat-icon>close</mat-icon>
          </button>

          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <mat-icon>cloud_sync</mat-icon>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white m-0">{{ mode() === 'signin' ? 'Sign In' : 'Create Account' }}</h3>
              <p class="text-xs text-slate-400 m-0">Sync your saved architectures across devices.</p>
            </div>
          </div>

          <!-- Google -->
          <button
            mat-stroked-button
            type="button"
            class="!border-slate-600 !text-slate-100 !bg-slate-800/60 hover:!bg-slate-700 !h-11 w-full !mb-4"
            [disabled]="submitting()"
            (click)="handleGoogle()">
            <svg class="!mr-2 inline-block align-text-bottom" width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <div class="flex items-center gap-3 mb-4">
            <div class="flex-1 h-px bg-slate-800"></div>
            <span class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">or</span>
            <div class="flex-1 h-px bg-slate-800"></div>
          </div>

          <!-- Mode toggle -->
          <div class="flex rounded-lg bg-slate-800/70 border border-slate-700 p-0.5 mb-4 text-xs font-bold">
            <button type="button" (click)="setMode('signin')"
              class="flex-1 h-8 rounded-md border-none cursor-pointer transition-colors"
              [class.bg-blue-600]="mode() === 'signin'" [class.text-white]="mode() === 'signin'"
              [class.bg-transparent]="mode() !== 'signin'" [class.text-slate-400]="mode() !== 'signin'">
              Sign In
            </button>
            <button type="button" (click)="setMode('signup')"
              class="flex-1 h-8 rounded-md border-none cursor-pointer transition-colors"
              [class.bg-blue-600]="mode() === 'signup'" [class.text-white]="mode() === 'signup'"
              [class.bg-transparent]="mode() !== 'signup'" [class.text-slate-400]="mode() !== 'signup'">
              Create Account
            </button>
          </div>

          <form (ngSubmit)="submit()" class="space-y-3">
            @if (mode() === 'signup') {
              <div>
                <label class="text-[11px] font-bold text-slate-400 block mb-1">Name (optional)</label>
                <input type="text" name="displayName" [(ngModel)]="displayName" autocomplete="name"
                  class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Jane Architect">
              </div>
            }
            <div>
              <label class="text-[11px] font-bold text-slate-400 block mb-1">Email</label>
              <input type="email" name="email" required [(ngModel)]="email" autocomplete="email"
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="you@company.com">
            </div>
            <div>
              <label class="text-[11px] font-bold text-slate-400 block mb-1">Password</label>
              <input type="password" name="password" required minlength="6" [(ngModel)]="password"
                [autocomplete]="mode() === 'signup' ? 'new-password' : 'current-password'"
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="••••••••">
            </div>

            @if (authService.authError()) {
              <div class="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {{ authService.authError() }}
              </div>
            }

            @if (resetSent()) {
              <div class="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                Password reset email sent to {{ email() }}.
              </div>
            }

            <button
              mat-flat-button
              type="submit"
              class="!bg-gradient-to-r !from-blue-600 !to-indigo-600 !text-white !h-11 w-full font-bold"
              [disabled]="submitting() || !email() || password().length < 6">
              {{ mode() === 'signin' ? 'Sign In' : 'Create Account' }}
            </button>

            @if (mode() === 'signin') {
              <button type="button" (click)="forgotPassword()" [disabled]="submitting() || !email()"
                class="text-xs text-slate-400 hover:text-blue-400 bg-transparent border-none cursor-pointer p-0">
                Forgot password?
              </button>
            }
          </form>

          <p class="text-[11px] text-slate-500 mt-5 mb-0 text-center leading-relaxed">
            Not ready to sign in? Close this and keep working as a guest — your architectures stay saved in this browser.
          </p>
        </div>
      </div>
    }
  `
})
export class AuthModalComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly authService = inject(AUTH_SERVICE_TOKEN);

  protected readonly mode = signal<AuthMode>('signin');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly displayName = signal('');
  protected readonly submitting = signal(false);
  protected readonly resetSent = signal(false);

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.resetSent.set(false);
    this.authService.clearAuthError();
  }

  async handleGoogle(): Promise<void> {
    this.submitting.set(true);
    try {
      await this.store.signInWithGoogle();
    } finally {
      this.submitting.set(false);
    }
  }

  async submit(): Promise<void> {
    if (!this.email() || this.password().length < 6) return;
    this.submitting.set(true);
    this.resetSent.set(false);
    try {
      if (this.mode() === 'signin') {
        await this.store.signInWithEmail(this.email(), this.password());
      } else {
        await this.store.signUpWithEmail(this.email(), this.password(), this.displayName());
      }
    } finally {
      this.submitting.set(false);
    }
  }

  async forgotPassword(): Promise<void> {
    if (!this.email()) return;
    this.submitting.set(true);
    this.resetSent.set(false);
    try {
      await this.store.sendPasswordReset(this.email());
      if (!this.authService.authError()) {
        this.resetSent.set(true);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  close(): void {
    this.email.set('');
    this.password.set('');
    this.displayName.set('');
    this.resetSent.set(false);
    this.store.closeAuthModal();
  }
}
