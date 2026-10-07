import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { STORE_DEVTOOLS_MAX_AGE } from './core/constants/store.constants';
import { apiInterceptor } from './core/interceptors/api.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { httpRetryInterceptor } from './core/interceptors/http-retry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([apiInterceptor, httpErrorInterceptor, httpRetryInterceptor]),
    ),
    provideStore(),
    provideEffects(),
    provideStoreDevtools({ maxAge: STORE_DEVTOOLS_MAX_AGE, logOnly: !isDevMode() }),
  ],
};
