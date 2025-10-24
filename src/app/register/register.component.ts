import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  registerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^08[0-9]\d{7}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), this.passwordComplexityValidator]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  ngOnInit() {
    // Clear any existing messages when component initializes
    this.errorMessage = null;
    this.successMessage = null;
  }

  passwordMatchValidator(form: any) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  passwordComplexityValidator(control: any) {
    if (!control.value) {
      return null;
    }
    
    const password = control.value;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const valid = hasUpperCase && hasLowerCase && hasNumbers;
    
    if (!valid) {
      return { 
        passwordComplexity: {
          hasUpperCase,
          hasLowerCase,
          hasNumbers,
          hasSpecialChar
        }
      };
    }
    
    return null;
  }

  onSubmit() {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.showFieldErrors();
      return;
    }

    this.loading = true;

    const { name, email, phone, password } = this.registerForm.value;

    const userData = {
      name: name,
      email: email,
      phone: phone,
      password: password
    };

    // Replace with actual backend registration endpoint
    this.http.post('https://backend-appointment-app-wqo0.onrender.com/api/auth/register', userData).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMessage = 'Registration successful! Redirecting to login...';
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        console.error('Registration error:', err);
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
      case 400:
        return error?.error?.message || 'Invalid registration data. Please check your information.';
      case 409:
        return 'Email already exists. Please use a different email address.';
      case 422:
        return 'Validation error. Please check your information and try again.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error?.error?.message || error?.message || 'Registration failed. Please try again.';
    }
  }

  private showFieldErrors(): void {
    const nameControl = this.registerForm.get('name');
    const emailControl = this.registerForm.get('email');
    const phoneControl = this.registerForm.get('phone');
    const passwordControl = this.registerForm.get('password');
    const confirmPasswordControl = this.registerForm.get('confirmPassword');
    
    if (nameControl?.errors && nameControl.touched) {
      if (nameControl.errors['required']) {
        this.errorMessage = 'Full name is required';
      } else if (nameControl.errors['minlength']) {
        this.errorMessage = 'Name must be at least 2 characters long';
      }
    } else if (emailControl?.errors && emailControl.touched) {
      if (emailControl.errors['required']) {
        this.errorMessage = 'Email is required';
      } else if (emailControl.errors['email']) {
        this.errorMessage = 'Please enter a valid email address';
      }
    } else if (phoneControl?.errors && phoneControl.touched) {
      if (phoneControl.errors['required']) {
        this.errorMessage = 'Phone number is required';
      } else if (phoneControl.errors['pattern']) {
        this.errorMessage = 'Please enter a valid Irish mobile number (e.g., 0833866364)';
      }
    } else if (passwordControl?.errors && passwordControl.touched) {
      if (passwordControl.errors['required']) {
        this.errorMessage = 'Password is required';
      } else if (passwordControl.errors['minlength']) {
        this.errorMessage = 'Password must be at least 8 characters long';
      } else if (passwordControl.errors['passwordComplexity']) {
        const complexity = passwordControl.errors['passwordComplexity'];
        const missing = [];
        if (!complexity.hasUpperCase) missing.push('uppercase letter');
        if (!complexity.hasLowerCase) missing.push('lowercase letter');
        if (!complexity.hasNumbers) missing.push('number');
        this.errorMessage = `Password must contain at least one ${missing.join(', ')}`;
      }
    } else if (confirmPasswordControl?.errors && confirmPasswordControl.touched) {
      if (confirmPasswordControl.errors['required']) {
        this.errorMessage = 'Please confirm your password';
      } else if (confirmPasswordControl.errors['passwordMismatch']) {
        this.errorMessage = 'Passwords do not match';
      }
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['pattern']) return 'Please enter a valid Irish mobile number (e.g., 0833866364)';
      if (field.errors['passwordMismatch']) return 'Passwords do not match';
      if (field.errors['passwordComplexity']) {
        const complexity = field.errors['passwordComplexity'];
        const missing = [];
        if (!complexity.hasUpperCase) missing.push('uppercase letter');
        if (!complexity.hasLowerCase) missing.push('lowercase letter');
        if (!complexity.hasNumbers) missing.push('number');
        return `Password must contain at least one ${missing.join(', ')}`;
      }
    }
    return '';
  }

  clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

}
