import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HealthCheckService, HealthCheckResponse } from '../health-check.service';

@Component({
  selector: 'app-backend-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backend-status" [class]="statusClass">
      <h3>Backend Status</h3>
      
      <div class="status-indicator">
        <span class="status-dot" [class]="statusClass"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>
      
      <div *ngIf="healthData" class="health-details">
        <p><strong>Status:</strong> {{ healthData.status }}</p>
        <p><strong>Environment:</strong> {{ healthData.environment }}</p>
        <p><strong>CORS:</strong> {{ healthData.cors }}</p>
        <p><strong>Last Check:</strong> {{ healthData.timestamp }}</p>
      </div>
      
      <div *ngIf="errorMessage" class="error-details">
        <p><strong>Error:</strong> {{ errorMessage }}</p>
      </div>
      
      <div class="actions">
        <button (click)="checkHealth()" [disabled]="loading">
          {{ loading ? 'Checking...' : 'Check Again' }}
        </button>
        <button (click)="testConnectivity()" [disabled]="loading">
          Test Connectivity
        </button>
      </div>
      
      <div class="instructions" *ngIf="!isHealthy">
        <h4>Backend Configuration Required</h4>
        <p>Your backend server needs to be configured to allow CORS requests from your frontend domain.</p>
        <ul>
          <li>Add CORS middleware to your backend server</li>
          <li>Allow origin: <code>https://kdbeautyappointmentapp.netlify.app</code></li>
          <li>Redeploy your backend to Render</li>
        </ul>
        <p>See <code>BACKEND_CORS_SETUP.md</code> for detailed instructions.</p>
      </div>
    </div>
  `,
  styles: [`
    .backend-status {
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      font-family: Arial, sans-serif;
    }
    
    .backend-status.healthy {
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
    }
    
    .backend-status.unhealthy {
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }
    
    .backend-status.checking {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      margin: 10px 0;
    }
    
    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 10px;
    }
    
    .status-dot.healthy {
      background-color: #28a745;
    }
    
    .status-dot.unhealthy {
      background-color: #dc3545;
    }
    
    .status-dot.checking {
      background-color: #ffc107;
    }
    
    .health-details, .error-details {
      margin: 15px 0;
      padding: 10px;
      background-color: rgba(255, 255, 255, 0.5);
      border-radius: 4px;
    }
    
    .actions {
      margin: 15px 0;
    }
    
    .actions button {
      margin-right: 10px;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background-color: #007bff;
      color: white;
    }
    
    .actions button:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }
    
    .instructions {
      margin-top: 20px;
      padding: 15px;
      background-color: rgba(255, 255, 255, 0.7);
      border-radius: 4px;
    }
    
    .instructions code {
      background-color: #f8f9fa;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
    }
    
    .instructions ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    
    .instructions li {
      margin: 5px 0;
    }
  `]
})
export class BackendStatusComponent implements OnInit {
  private readonly healthCheckService = inject(HealthCheckService);
  
  healthData: HealthCheckResponse | null = null;
  errorMessage: string | null = null;
  loading = false;
  isHealthy = false;
  
  get statusClass(): string {
    if (this.loading) return 'checking';
    return this.isHealthy ? 'healthy' : 'unhealthy';
  }
  
  get statusText(): string {
    if (this.loading) return 'Checking...';
    return this.isHealthy ? 'Backend is healthy' : 'Backend is not accessible';
  }
  
  ngOnInit() {
    this.checkHealth();
  }
  
  checkHealth() {
    this.loading = true;
    this.errorMessage = null;
    
    this.healthCheckService.checkBackendHealth().subscribe({
      next: (response) => {
        this.loading = false;
        if (response) {
          this.healthData = response;
          this.isHealthy = true;
        } else {
          this.isHealthy = false;
          this.errorMessage = 'Health check endpoint not available';
        }
      },
      error: (error) => {
        this.loading = false;
        this.isHealthy = false;
        this.errorMessage = this.healthCheckService.getErrorDetails(error);
      }
    });
  }
  
  testConnectivity() {
    this.loading = true;
    this.errorMessage = null;
    
    this.healthCheckService.testConnectivity().subscribe({
      next: (success) => {
        this.loading = false;
        this.isHealthy = success;
        if (!success) {
          this.errorMessage = 'Basic connectivity test failed';
        }
      },
      error: (error) => {
        this.loading = false;
        this.isHealthy = false;
        this.errorMessage = this.healthCheckService.getErrorDetails(error);
      }
    });
  }
}
