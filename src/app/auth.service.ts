import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'admin' | 'user';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Use signals for reactive state
  public isAuthenticated = signal(false);
  public isAdmin = signal(false);
  public currentUser = signal<User | null>(null);

  constructor() {
    // Check for stored token on service init
    this.checkStoredAuth();
  }

  private checkStoredAuth(): void {
    // Only access localStorage in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('current_user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.setUser(user);
      } catch (error) {
        console.error('Error parsing user:', error);
        this.clearAuth();
      }
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    // First, get all users and find matching email
    return this.http.get<any[]>('https://backend-appointment-app-wqo0.onrender.com/api/v1/users').pipe(
      map(users => {
        // Make email comparison case-insensitive
        const user = users.find(u => u.email.toLowerCase() === credentials.email.toLowerCase());
        
        if (!user) {
          throw new Error('User not found');
        }
        
        // Create response in expected format
        const response: LoginResponse = {
          user: {
            id: user._id || user.id,
            email: user.email,
            name: user.name,
            phone: user.phonenumber || user.phone, // Use phonenumber field (or fallback to phone)
            role: user.role || 'user' // Use actual role from backend
          },
          token: `token_${user._id || user.id}_${Date.now()}`
        };
        
        // Save user data and token
        this.setUser(response.user);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('current_user', JSON.stringify(response.user));
        }
        
        return response;
      }),
      catchError(error => {
        console.error('Login error:', error);
        throw error;
      })
    );
  }

  logout(): void {
    this.clearAuth();
    this.router.navigate(['/']);
  }

  private setUser(user: User): void {
    // Use the role from the backend exactly as it is
    const actualRole = user.role;
    
    this.currentUserSubject.next(user);
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    this.isAdmin.set(actualRole === 'admin');
  }

  private clearAuth(): void {
    this.currentUserSubject.next(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.isAdmin.set(false);
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    }
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('auth_token');
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.role === role;
  }

  // Debug method to check auth status
  debugAuthStatus(): void {
    console.log('=== AUTH STATUS DEBUG ===');
    console.log('isAuthenticated:', this.isAuthenticated());
    console.log('isAdmin:', this.isAdmin());
    console.log('currentUser:', this.currentUser());
    
    if (isPlatformBrowser(this.platformId)) {
      console.log('localStorage auth_token:', localStorage.getItem('auth_token'));
      console.log('localStorage current_user:', localStorage.getItem('current_user'));
    }
  }

  // Method to manually set a test user (for debugging)
  setTestUser(): void {
    const testUser: User = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    };
    
    this.setUser(testUser);
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('current_user', JSON.stringify(testUser));
    }
    
    console.log('Test user set:', testUser);
  }

  updateUser(updatedUser: User): void {
    this.currentUserSubject.next(updatedUser);
    this.currentUser.set(updatedUser);
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('current_user', JSON.stringify(updatedUser));
    }
  }

  // Forgot Password Methods
  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    console.log('Sending forgot password request for:', email);
    
    return this.http.post<ForgotPasswordResponse>(
      'https://backend-appointment-app-wqo0.onrender.com/api/auth/forgot-password',
      { email }
    ).pipe(
      tap(response => {
        console.log('Forgot password response:', response);
      }),
      catchError(error => {
        console.error('Forgot password error:', error);
        throw error;
      })
    );
  }

  resetPassword(token: string, password: string): Observable<ResetPasswordResponse> {
    console.log('Sending reset password request with token:', token);
    
    // Note: This endpoint needs to be implemented in your backend
    // For now, we'll use a placeholder that matches your backend pattern
    return this.http.post<ResetPasswordResponse>(
      'https://backend-appointment-app-wqo0.onrender.com/api/auth/reset-password',
      { token, password }
    ).pipe(
      tap(response => {
        console.log('Reset password response:', response);
      }),
      catchError(error => {
        console.error('Reset password error:', error);
        throw error;
      })
    );
  }

  // Send welcome email to new user
  sendWelcomeEmail(userId: string): Observable<{ success: boolean; message: string }> {
    console.log('Sending welcome email for user:', userId);
    
    return this.http.post<{ success: boolean; message: string }>(
      `https://backend-appointment-app-wqo0.onrender.com/api/auth/send-welcome-email/${userId}`,
      {}
    ).pipe(
      tap(response => {
        console.log('Welcome email response:', response);
      }),
      catchError(error => {
        console.error('Welcome email error:', error);
        throw error;
      })
    );
  }
}
