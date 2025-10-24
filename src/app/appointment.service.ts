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
  
  // Offline mode flag - set to true to enable offline testing
  private readonly OFFLINE_MODE = true;

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
    // Offline mode - return appointments from localStorage
    if (this.OFFLINE_MODE) {
      console.log('🔧 OFFLINE MODE: Getting appointments from localStorage');
      const storedAppointments = localStorage.getItem('offline_appointments');
      const appointments = storedAppointments ? JSON.parse(storedAppointments) : [];
      console.log('Offline appointments:', appointments);
      return new Observable(observer => {
        observer.next(appointments);
        observer.complete();
      });
    }
    
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
    // Offline mode - save appointment to localStorage
    if (this.OFFLINE_MODE) {
      console.log('🔧 OFFLINE MODE: Creating appointment in localStorage');
      
      // Generate a unique ID for the appointment
      const appointmentWithId = {
        ...payload,
        _id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      // Get existing appointments
      const storedAppointments = localStorage.getItem('offline_appointments');
      const appointments = storedAppointments ? JSON.parse(storedAppointments) : [];
      
      // Add new appointment
      appointments.push(appointmentWithId);
      
      // Save back to localStorage
      localStorage.setItem('offline_appointments', JSON.stringify(appointments));
      
      console.log('Offline appointment created:', appointmentWithId);
      console.log('All offline appointments:', appointments);
      
      return new Observable(observer => {
        observer.next({ message: 'Appointment created successfully (offline mode)' });
        observer.complete();
      });
    }
    
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
    // Offline mode - remove appointment from localStorage
    if (this.OFFLINE_MODE) {
      console.log('🔧 OFFLINE MODE: Deleting appointment from localStorage');
      
      // Get existing appointments
      const storedAppointments = localStorage.getItem('offline_appointments');
      const appointments = storedAppointments ? JSON.parse(storedAppointments) : [];
      
      // Remove appointment with matching ID
      const filteredAppointments = appointments.filter((apt: AppointmentDto) => apt._id !== id);
      
      // Save back to localStorage
      localStorage.setItem('offline_appointments', JSON.stringify(filteredAppointments));
      
      console.log('Offline appointment deleted:', id);
      console.log('Remaining offline appointments:', filteredAppointments);
      
      return new Observable(observer => {
        observer.next({ message: 'Appointment deleted successfully (offline mode)' });
        observer.complete();
      });
    }
    
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }
}


