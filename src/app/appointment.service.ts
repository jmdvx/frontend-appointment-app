import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private readonly baseUrl = 'http://localhost:3000/api/v1/appointments';

  getAppointments(): Observable<AppointmentDto[]> {
    return this.http.get<AppointmentDto[]>(this.baseUrl);
  }

  getAppointmentsByUserId(userId: string): Observable<AppointmentDto[]> {
    return this.http.get<AppointmentDto[]>(`${this.baseUrl}/user/${userId}`);
  }

  createAppointment(payload: AppointmentDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.baseUrl, payload);
  }

  updateAppointment(id: string, payload: Partial<AppointmentDto>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/${id}`, payload);
  }

  deleteAppointment(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}


