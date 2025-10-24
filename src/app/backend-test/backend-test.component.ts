import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-backend-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backend-test">
      <h2>Backend Connection Test</h2>
      
      <div class="test-section">
        <h3>API Information</h3>
        <button (click)="testApiInfo()" [disabled]="loading">
          {{ loading ? 'Testing...' : 'Test API Info' }}
        </button>
        
        <div *ngIf="apiInfo" class="result success">
          <h4>✅ API Response:</h4>
          <pre>{{ apiInfo | json }}</pre>
        </div>
        
        <div *ngIf="apiError" class="result error">
          <h4>❌ API Error:</h4>
          <p>{{ apiError }}</p>
        </div>
      </div>
      
      <div class="test-section">
        <h3>Users Endpoint Test</h3>
        <button (click)="testUsersEndpoint()" [disabled]="loading">
          {{ loading ? 'Testing...' : 'Test Users Endpoint' }}
        </button>
        
        <div *ngIf="usersData" class="result success">
          <h4>✅ Users Response:</h4>
          <p>Found {{ usersData.length }} users</p>
          <pre>{{ usersData | json }}</pre>
        </div>
        
        <div *ngIf="usersError" class="result error">
          <h4>❌ Users Error:</h4>
          <p>{{ usersError }}</p>
        </div>
      </div>
      
      <div class="test-section">
        <h3>CORS Test</h3>
        <button (click)="testCors()" [disabled]="loading">
          {{ loading ? 'Testing...' : 'Test CORS Headers' }}
        </button>
        
        <div *ngIf="corsResult" class="result" [class.success]="corsResult.success" [class.error]="!corsResult.success">
          <h4>{{ corsResult.success ? '✅' : '❌' }} CORS Test:</h4>
          <p>{{ corsResult.message }}</p>
          <div *ngIf="corsResult.headers">
            <h5>Response Headers:</h5>
            <pre>{{ corsResult.headers | json }}</pre>
          </div>
        </div>
      </div>
      
      <div class="instructions">
        <h3>Next Steps:</h3>
        <ol>
          <li>If API Info works but Users/CORS fails → Add CORS configuration to backend</li>
          <li>If all tests fail → Check if backend is running and accessible</li>
          <li>If CORS test passes → Your frontend should work!</li>
        </ol>
      </div>
    </div>
  `,
  styles: [`
    .backend-test {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
      font-family: Arial, sans-serif;
    }
    
    .test-section {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background-color: #f9f9f9;
    }
    
    .test-section h3 {
      margin-top: 0;
      color: #333;
    }
    
    button {
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin: 10px 0;
    }
    
    button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }
    
    .result {
      margin: 15px 0;
      padding: 15px;
      border-radius: 4px;
    }
    
    .result.success {
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
    }
    
    .result.error {
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }
    
    pre {
      background-color: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }
    
    .instructions {
      margin-top: 30px;
      padding: 20px;
      background-color: #e7f3ff;
      border-radius: 8px;
      border-left: 4px solid #007bff;
    }
    
    .instructions ol {
      margin: 10px 0;
    }
    
    .instructions li {
      margin: 5px 0;
    }
  `]
})
export class BackendTestComponent implements OnInit {
  private readonly http = inject(HttpClient);
  
  loading = false;
  apiInfo: any = null;
  apiError: string | null = null;
  usersData: any[] | null = null;
  usersError: string | null = null;
  corsResult: any = null;
  
  ngOnInit() {
    // Auto-test API info on component load
    this.testApiInfo();
  }
  
  testApiInfo() {
    this.loading = true;
    this.apiError = null;
    
    this.http.get('https://backend-appointment-app-wqo0.onrender.com/ping').subscribe({
      next: (response) => {
        this.loading = false;
        this.apiInfo = response;
        console.log('✅ API Info test successful:', response);
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.apiError = this.getErrorMessage(error);
        console.error('❌ API Info test failed:', error);
      }
    });
  }
  
  testUsersEndpoint() {
    this.loading = true;
    this.usersError = null;
    
    this.http.get(`${environment.apiUrl}/users`).subscribe({
      next: (response) => {
        this.loading = false;
        this.usersData = response as any[];
        console.log('✅ Users endpoint test successful:', response);
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.usersError = this.getErrorMessage(error);
        console.error('❌ Users endpoint test failed:', error);
      }
    });
  }
  
  testCors() {
    this.loading = true;
    
    // Test CORS by making a request and checking headers
    fetch(`${environment.apiUrl}/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      this.loading = false;
      
      const headers: { [key: string]: string } = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      const hasCorsHeaders = headers['access-control-allow-origin'] || 
                           headers['Access-Control-Allow-Origin'];
      
      this.corsResult = {
        success: hasCorsHeaders,
        message: hasCorsHeaders 
          ? 'CORS is properly configured!' 
          : 'CORS headers missing - backend needs CORS configuration',
        headers: headers
      };
      
      console.log('CORS test result:', this.corsResult);
    })
    .catch(error => {
      this.loading = false;
      this.corsResult = {
        success: false,
        message: `CORS test failed: ${error.message}`,
        headers: null
      };
      console.error('CORS test error:', error);
    });
  }
  
  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Network Error: Cannot connect to backend server.';
    }
    
    if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
      return 'CORS Error: Backend server is not configured to allow requests from this domain.';
    }
    
    if (error.status === 503) {
      return 'Service Unavailable: Backend server is temporarily unavailable.';
    }
    
    if (error.status >= 500) {
      return `Server Error: Backend server error (${error.status}).`;
    }
    
    return `Error: ${error.status} ${error.statusText}`;
  }
}
