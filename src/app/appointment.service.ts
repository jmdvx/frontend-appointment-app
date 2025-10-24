import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface AttendeeDto {
  name: string;
  email: string;
  phone?: string;
  rsvp: 'yes' | 'no' | 'maybe';
}

export interface AppointmentDto {
  _id?: string;
  userId: string;
  title: string;
  description?: string;
  date: string;
  location: string;
  attendees: AttendeeDto[];
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/appointments`;

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Appointment service error:', error);
    
    // Handle CORS errors
    if (error.status === 0 || error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
      throw new Error('CORS Error: Unable to connect to the server. Please check if the backend is configured to allow requests from this domain.');
    }
    
    // Handle other HTTP errors
    if (error.status >= 400 && error.status < 500) {
      throw new Error('Invalid request. Please check your data and try again.');
    } else if (error.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    throw new Error('Network error. Please check your connection and try again.');
  }

  getAppointments(): Observable<AppointmentDto[]> {
    return this.http.get<AppointmentDto[]>(this.baseUrl).pipe(
      catchError(this.handleError)
    );
  }

  getAppointmentsByUserId(userId: string): Observable<AppointmentDto[]> {
    return this.http.get<AppointmentDto[]>(`${this.baseUrl}/user/${userId}`).pipe(
      catchError(this.handleError)
    );
  }

  createAppointment(payload: AppointmentDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.baseUrl, payload).pipe(
      catchError(this.handleError)
    );
  }

  updateAppointment(id: string, payload: Partial<AppointmentDto>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/${id}`, payload).pipe(
      catchError(this.handleError)
    );
  }

  deleteAppointment(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }
}


