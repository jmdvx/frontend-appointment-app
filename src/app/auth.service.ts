import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../environments/environment';

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

  // Offline mode flag - set to true to enable offline testing
  private readonly OFFLINE_MODE = true;

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
    console.log('Attempting login with:', credentials);
    
    // Offline mode for testing
    if (this.OFFLINE_MODE) {
      console.log('🔧 OFFLINE MODE: Simulating successful login');
      
      // Determine user name based on email
      let userName = 'User';
      if (credentials.email.toLowerCase().includes('james')) {
        userName = 'James';
      } else if (credentials.email.toLowerCase().includes('katie')) {
        userName = 'Katie';
      } else if (credentials.email.toLowerCase().includes('admin')) {
        userName = 'Admin';
      } else {
        // Extract name from email (part before @)
        const emailPart = credentials.email.split('@')[0];
        userName = emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
      }
      
      // Simulate a successful login with realistic data
      const mockUser: User = {
        id: 'user-' + Date.now(),
        email: credentials.email,
        name: userName,
        phone: '0833866364',
        role: credentials.email.toLowerCase().includes('admin') ? 'admin' : 'user'
      };
      
      const mockResponse: LoginResponse = {
        user: mockUser,
        token: `offline_token_${Date.now()}`
      };
      
      // Save user data and token
      this.setUser(mockResponse.user);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('auth_token', mockResponse.token);
        localStorage.setItem('current_user', JSON.stringify(mockResponse.user));
      }
      
      return of(mockResponse);
    }
    
    // First, get all users and find matching email
    return this.http.get<any[]>(`${environment.apiUrl}/users`).pipe(
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
      catchError((error: HttpErrorResponse) => {
        console.error('Login error:', error);
        
        // Handle CORS errors specifically
        if (error.status === 0 || error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
          console.error('CORS Error: The backend server needs to be configured to allow requests from your frontend domain.');
          console.error('Frontend domain:', window.location.origin);
          console.error('Backend URL:', environment.apiUrl);
          throw new Error('CORS Error: Unable to connect to the server. Please check if the backend is configured to allow requests from this domain.');
        }
        
        // Handle other HTTP errors
        if (error.status >= 400 && error.status < 500) {
          throw new Error('Invalid credentials or user not found');
        } else if (error.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        
        throw new Error('Network error. Please check your connection and try again.');
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
    console.log('OFFLINE_MODE:', this.OFFLINE_MODE);
    
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
    
    // Offline mode for testing
    if (this.OFFLINE_MODE) {
      console.log('🔧 OFFLINE MODE: Simulating forgot password');
      return of({ message: 'Password reset email sent successfully (offline mode)' });
    }
    
    return this.http.post<ForgotPasswordResponse>(
      `${environment.authApiUrl}/forgot-password`,
      { email }
    ).pipe(
      tap(response => {
        console.log('Forgot password response:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Forgot password error:', error);
        
        // Handle CORS errors
        if (error.status === 0 || error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
          throw new Error('CORS Error: Unable to connect to the server. Please check if the backend is configured to allow requests from this domain.');
        }
        
        throw error;
      })
    );
  }

  resetPassword(token: string, password: string): Observable<ResetPasswordResponse> {
    console.log('Sending reset password request with token:', token);
    
    // Offline mode for testing
    if (this.OFFLINE_MODE) {
      console.log('🔧 OFFLINE MODE: Simulating password reset');
      return of({ message: 'Password reset successfully (offline mode)' });
    }
    
    // Note: This endpoint needs to be implemented in your backend
    // For now, we'll use a placeholder that matches your backend pattern
    return this.http.post<ResetPasswordResponse>(
      `${environment.authApiUrl}/reset-password`,
      { token, password }
    ).pipe(
      tap(response => {
        console.log('Reset password response:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Reset password error:', error);
        
        // Handle CORS errors
        if (error.status === 0 || error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
          throw new Error('CORS Error: Unable to connect to the server. Please check if the backend is configured to allow requests from this domain.');
        }
        
        throw error;
      })
    );
  }

  // Send welcome email to new user
  sendWelcomeEmail(userId: string): Observable<{ success: boolean; message: string }> {
    console.log('Sending welcome email for user:', userId);
    
    // Offline mode for testing
    if (this.OFFLINE_MODE) {
      console.log('🔧 OFFLINE MODE: Simulating welcome email');
      return of({ success: true, message: 'Welcome email sent successfully (offline mode)' });
    }
    
    return this.http.post<{ success: boolean; message: string }>(
      `${environment.authApiUrl}/send-welcome-email/${userId}`,
      {}
    ).pipe(
      tap(response => {
        console.log('Welcome email response:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Welcome email error:', error);
        
        // Handle CORS errors
        if (error.status === 0 || error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
          throw new Error('CORS Error: Unable to connect to the server. Please check if the backend is configured to allow requests from this domain.');
        }
        
        throw error;
      })
    );
  }
}