import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/image-search/image-search.routes').then((m) => m.IMAGE_SEARCH_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
