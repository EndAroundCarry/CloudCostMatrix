import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { ESTIMATE_REPOSITORY_TOKEN } from './core/repositories/estimate.repository.interface';
import { FirebaseEstimateRepository } from './infrastructure/firebase/firebase-estimate.repository';
import { AUTH_SERVICE_TOKEN } from './core/repositories/auth.service.interface';
import { FirebaseAuthService } from './infrastructure/firebase/firebase-auth.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: ESTIMATE_REPOSITORY_TOKEN, useClass: FirebaseEstimateRepository },
        { provide: AUTH_SERVICE_TOKEN, useClass: FirebaseAuthService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
