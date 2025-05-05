import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// Login Auth
import { environment } from '../../../environments/environment';
import { AuthenticationService } from '../../core/services/auth.service';
import { AuthfakeauthenticationService } from '../../core/services/authfake.service';
// Import finalize operator
import { first, finalize } from 'rxjs/operators';
import { ToastService } from './toast-service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})

/**
 * Login Component
 */
export class LoginComponent implements OnInit {

  // Login Form
  loginForm!: UntypedFormGroup;
  submitted = false;
  fieldTextType!: boolean;
  error = '';
  returnUrl!: string;
  // Add loading property
  loading = false;
  // set the current year
  year: number = new Date().getFullYear();

  constructor(private formBuilder: UntypedFormBuilder, private authenticationService: AuthenticationService, private router: Router,
    private authFackservice: AuthfakeauthenticationService, private route: ActivatedRoute, public toastService: ToastService) {
    // redirect to home if already logged in
    if (this.authenticationService.currentUserValue) {
      this.router.navigate(['/camera']);
    }
  }

  ngOnInit(): void {
    if (localStorage.getItem('currentUser')) {
      this.router.navigate(['/camera']);
    }
    /**
     * Form Validatyion
     */
    this.loginForm = this.formBuilder.group({
      // Renamed form control from 'email' to 'nik'
      nik: ['1234567890', [Validators.required]], // Example NIK, adjust default value if needed
      password: ['123456', [Validators.required]],
    });
    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/camera';
  }

  // convenience getter for easy access to form fields
  // Updated to reference 'nik'
  get f() { return this.loginForm.controls; }

  /**
   * Form submit
   */
  onSubmit() {
    this.submitted = true;
    // Set loading to true when submission starts
    this.loading = true;

    // stop here if form is invalid
    if (this.loginForm.invalid) {
      this.toastService.show('Please fill in both NIK and Password.', { classname: 'bg-warning text-white', delay: 3000 });
      // Reset loading if form is invalid
      this.loading = false;
      return;
    }

    // Call the login service using the 'nik' form control value
    this.authenticationService.login(this.f['nik'].value, this.f['password'].value)
      .pipe(
        // Use finalize to ensure loading is reset on completion or error
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (data: any) => {
          // Assuming the API returns a structure like { status: 'success', token: '...', data: '...' }
          // Adjust based on your actual API response structure
          if (data && data.data.token) { // Check for token presence for success
            localStorage.setItem('toast', 'true'); // Optional: for login success toast
            // Store user info if needed, adjust 'data.user' based on your API response
            // localStorage.setItem('currentUser', JSON.stringify(data.user || { nik: this.f['nik'].value })); // Updated reference here too if uncommented
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.data.user));
            this.router.navigate([this.returnUrl]); // Navigate to the originally intended URL or '/'
          } else {
            // Handle cases where API call succeeded but login failed (e.g., wrong credentials)
            const errorMessage = data?.message || 'Invalid NIK or Password.';
            this.toastService.show(errorMessage, { classname: 'bg-danger text-white', delay: 5000 });
            this.error = errorMessage; // Store error if needed
          }
        },
        error: (error) => {
          // Handle HTTP errors (e.g., network issues, server errors)
          console.error('Login failed:', error);
          const errorMessage = error?.error?.message || 'An error occurred during login. Please try again.';
          this.toastService.show(errorMessage, { classname: 'bg-danger text-white', delay: 5000 });
          this.error = errorMessage; // Store error if needed
        }
      });
  }

  /**
   * Password Hide/Show
   */
  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

}
