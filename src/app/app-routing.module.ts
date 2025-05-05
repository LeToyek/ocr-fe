import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LayoutComponent } from './layouts/layout.component';
import { AuthGuard } from './core/guards/auth.guard'; // Import the guard

const routes: Routes = [
  // Public routes (like login, register) should NOT have the guard
  { path: 'auth', loadChildren: () => import('./account/account.module').then(m => m.AccountModule) },
  { path: 'landing', loadChildren: () => import('./landing/landing.module').then(m => m.LandingModule) },

  // Protected routes (dashboard, pages, etc.) should have the guard
  {
    path: '', component: LayoutComponent, loadChildren: () => import('./pages/pages.module').then(m => m.PagesModule),
    canActivate: [AuthGuard] // Apply the guard here
  },
  // Add other protected routes similarly
  // { path: 'some-protected-feature', component: SomeComponent, canActivate: [AuthGuard] },

  { path: '**', redirectTo: 'camera' } // Or a 404 page
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
