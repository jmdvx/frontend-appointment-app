import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // Forgot password properties
  showForgotPassword = false;
  forgotPasswordLoading = false;
  forgotPasswordMessage: string | null = null;
  forgotPasswordSuccess = false;

  ngOnInit() {
    // Clear any existing messages when component initializes
    this.errorMessage = null;
    this.successMessage = null;
  }

  onSubmit() {
    this.errorMessage = null;
    this.successMessage = null;
    
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.showFieldErrors();
      return;
    }

    this.loading = true;
    
    const { email, password } = this.loginForm.value;
    
    console.log('Attempting login with:', { email, password });
    
    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.loading = false;
        this.successMessage = 'Login successful! Redirecting...';
        
        // Small delay to show success message
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1000);
      },
      error: (err) => {
        console.error('Login error:', err);
        this.loading = false;
        this.errorMessage = this.getErrorMessage(err);
      }
    });
  }

  private getErrorMessage(error: any): string {
    // Check if we got HTML instead of JSON (server not running)
    if (error.error && typeof error.error === 'string' && error.error.includes('<!DOCTYPE')) {
      return 'Backend server is not running. Please check if the server is started on port 3000.';
    }
    
    // Network errors
    if (error.status === 0) {
      return 'Unable to connect to server. Please check your internet connection.';
    }
    
    // HTTP status errors
    switch (error.status) {
      case 401:
        return 'Invalid email or password. Please try again.';
      case 403:
        return 'Account is disabled. Please contact support.';
      case 404:
        return 'User not found. Please check your email address.';
      case 429:
        return 'Too many login attempts. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error?.error?.message || error?.message || 'Login failed. Please try again.';
    }
  }

  private showFieldErrors(): void {
    const emailControl = this.loginForm.get('email');
    const passwordControl = this.loginForm.get('password');
    
    if (emailControl?.errors && emailControl.touched) {
      if (emailControl.errors['required']) {
        this.errorMessage = 'Email is required';
      } else if (emailControl.errors['email']) {
        this.errorMessage = 'Please enter a valid email address';
      }
    } else if (passwordControl?.errors && passwordControl.touched) {
      if (passwordControl.errors['required']) {
        this.errorMessage = 'Password is required';
      } else if (passwordControl.errors['minlength']) {
        this.errorMessage = 'Password must be at least 6 characters long';
      }
    }
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  // Forgot Password Methods
  closeForgotPassword() {
    this.showForgotPassword = false;
    this.forgotPasswordForm.reset();
    this.forgotPasswordMessage = null;
    this.forgotPasswordSuccess = false;
  }

  onForgotPasswordSubmit() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.forgotPasswordLoading = true;
    this.forgotPasswordMessage = null;
    
    const email = this.forgotPasswordForm.get('email')?.value;
    
    console.log('Sending password reset request for:', email);
    
    // Call the backend forgot password endpoint
    this.authService.forgotPassword(email!).subscribe({
      next: (response) => {
        this.forgotPasswordLoading = false;
        this.forgotPasswordSuccess = true;
        this.forgotPasswordMessage = 'Password reset link has been sent to your email address. Please check your inbox and follow the instructions to reset your password.';
        
        // Auto-close modal after 3 seconds
        setTimeout(() => {
          this.closeForgotPassword();
        }, 3000);
      },
      error: (err) => {
        this.forgotPasswordLoading = false;
        this.forgotPasswordSuccess = false;
        this.forgotPasswordMessage = this.getForgotPasswordErrorMessage(err);
      }
    });
  }

  private getForgotPasswordErrorMessage(error: any): string {
    switch (error.status) {
      case 404:
        return 'No account found with this email address.';
      case 429:
        return 'Too many reset requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error?.error?.message || 'Failed to send reset link. Please try again.';
    }
  }
}
