import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { ESTIMATE_REPOSITORY_TOKEN } from './core/repositories/estimate.repository.interface';
import { FirebaseEstimateRepository } from './infrastructure/firebase/firebase-estimate.repository';
import { AUTH_SERVICE_TOKEN } from './core/repositories/auth.service.interface';
import { FirebaseAuthService } from './infrastructure/firebase/firebase-auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    
    // Dependency Injection Providers (Clean Architecture: Swap with DotNet repositories anytime)
    { provide: ESTIMATE_REPOSITORY_TOKEN, useClass: FirebaseEstimateRepository },
    { provide: AUTH_SERVICE_TOKEN, useClass: FirebaseAuthService }
  ]
};
