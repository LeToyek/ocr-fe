import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';

// Import your authentication service if you have one, otherwise check localStorage directly
// import { AuthenticationService } from '../services/auth.service'; // Example

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router
    // private authenticationService: AuthenticationService // Inject if using a service
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {

    // Check if the token exists in localStorage (or use your auth service)
    const token = localStorage.getItem('token'); // Adjust key if needed
    console.log("token is " + token )

    if (token) {
      // Logged in, so return true
      return true;
    }

    // Not logged in, redirect to login page with the return url
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}
