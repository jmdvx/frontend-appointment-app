import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  cors: string;
  environment: string;
}

@Injectable({
  providedIn: 'root'
})
export class HealthCheckService {
  private readonly http = inject(HttpClient);

  // Check if backend is accessible
  checkBackendHealth(): Observable<HealthCheckResponse | null> {
    console.log('🔍 Checking backend health...');
    
    return this.http.get<HealthCheckResponse>(`${environment.apiUrl}/health`).pipe(
      map(response => {
        console.log('✅ Backend health check successful:', response);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Backend health check failed:', error);
        
        if (error.status === 0 || error.message.includes('CORS')) {
          console.error('🚫 CORS Error: Backend is not configured to allow requests from this domain');
        } else if (error.status === 404) {
          console.error('🔍 Health endpoint not found - backend may not have health check endpoint');
        } else if (error.status >= 500) {
          console.error('💥 Backend server error');
        }
        
        return of(null);
      })
    );
  }

  // Test basic connectivity
  testConnectivity(): Observable<boolean> {
    console.log('🔍 Testing basic connectivity...');
    
    return this.http.get(`${environment.apiUrl}/users`).pipe(
      map(() => {
        console.log('✅ Basic connectivity test successful');
        return true;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Basic connectivity test failed:', error);
        
        if (error.status === 0) {
          console.error('🚫 Network error - cannot reach backend');
        } else if (error.message.includes('CORS')) {
          console.error('🚫 CORS Error - backend needs CORS configuration');
        } else {
          console.error('💥 Backend error:', error.status, error.statusText);
        }
        
        return of(false);
      })
    );
  }

  // Get detailed error information
  getErrorDetails(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Network Error: Cannot connect to backend server. Check if the server is running and accessible.';
    }
    
    if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
      return 'CORS Error: Backend server is not configured to allow requests from this domain. Please configure CORS on your backend server.';
    }
    
    if (error.status === 404) {
      return 'Not Found: The requested endpoint does not exist on the backend server.';
    }
    
    if (error.status >= 500) {
      return 'Server Error: Backend server encountered an internal error.';
    }
    
    if (error.status >= 400 && error.status < 500) {
      return 'Client Error: Invalid request sent to backend server.';
    }
    
    return `Unknown Error: ${error.status} ${error.statusText}`;
  }
}
