import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { AUTH_SERVICE_TOKEN } from './core/repositories/auth.service.interface';
import { ESTIMATE_REPOSITORY_TOKEN } from './core/repositories/estimate.repository.interface';
import { NoopAuthService } from './infrastructure/noop/noop-auth.service';
import { NoopEstimateRepository } from './infrastructure/noop/noop-estimate.repository';

/**
 * Server-only overrides, merged over the shared appConfig. `mergeApplicationConfig`
 * concatenates provider arrays and Angular DI resolves a token to its LAST
 * registration, so these two bindings below win over the Firebase-backed ones
 * appConfig registers — the real Firebase services are never constructed
 * during prerendering. See NoopAuthService for why that matters.
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: AUTH_SERVICE_TOKEN, useClass: NoopAuthService },
    { provide: ESTIMATE_REPOSITORY_TOKEN, useClass: NoopEstimateRepository }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
