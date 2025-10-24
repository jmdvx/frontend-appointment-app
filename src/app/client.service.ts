import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Client {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  dateJoined: Date;
  lastUpdated: Date;
  notes?: string;
  isBanned?: boolean;
  roles?: string[];
  preferences?: {
    favoriteServices?: string[];
    preferredTimes?: string[];
    allergies?: string[];
    specialRequests?: string;
  };
  totalAppointments?: number;
  lastAppointment?: Date;
}

export interface ClientAppointmentHistory {
  client: Client;
  appointments: any[];
  totalSpent: number;
  favoriteService: string;
}

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/clients';

  // Get all clients
  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(this.baseUrl).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Client service error:', error);
        
        // Check if the response is HTML (indicates server error or wrong endpoint)
        if (error.error && typeof error.error === 'string' && error.error.includes('<!DOCTYPE')) {
          console.error('Backend returned HTML instead of JSON. Server may be down or endpoint not found.');
          return throwError(() => new Error('Backend server is not responding correctly. Please check if the server is running.'));
        }
        
        // Handle other HTTP errors
        if (error.status === 0) {
          return throwError(() => new Error('Unable to connect to the server. Please check your connection and ensure the backend is running.'));
        }
        
        if (error.status === 404) {
          return throwError(() => new Error('Client API endpoint not found. Please check the backend configuration.'));
        }
        
        if (error.status >= 500) {
          return throwError(() => new Error('Server error occurred. Please try again later.'));
        }
        
        // For other errors, return the original error message
        return throwError(() => new Error(error.message || 'Failed to load clients'));
      })
    );
  }

  // Get client by ID
  getClientById(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.baseUrl}/${id}`);
  }

  // Create new client
  createClient(client: Partial<Client>): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.baseUrl, client);
  }

  // Update client
  updateClient(id: string, client: Partial<Client>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/${id}`, client);
  }

  // Delete client
  deleteClient(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  // Get client appointment history
  getClientAppointmentHistory(clientId: string): Observable<ClientAppointmentHistory> {
    return this.http.get<ClientAppointmentHistory>(`${this.baseUrl}/${clientId}/appointments`);
  }

  // Get clients with appointment statistics
  getClientsWithStats(): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.baseUrl}/with-stats`);
  }
}
