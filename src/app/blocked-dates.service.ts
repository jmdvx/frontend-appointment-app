import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../environments/environment';

export interface BlockedDateDto {
  _id?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  reason?: string;
  isRecurring?: boolean;
  recurringPattern?: 'weekly' | 'monthly' | 'yearly';
  createdBy: string; // User ID who created the block
  createdAt: Date;
  updatedAt: Date;
}

export interface BlockedDateResponse {
  message: string;
  blockedDate?: BlockedDateDto;
}

@Injectable({ providedIn: 'root' })
export class BlockedDatesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/blocked-dates`;

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Blocked dates service error:', error);
    
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

  // Get all blocked dates
  getBlockedDates(): Observable<BlockedDateDto[]> {
    return this.http.get<BlockedDateDto[]>(this.baseUrl).pipe(
      catchError(this.handleError)
    );
  }

  // Get blocked dates for a specific month
  getBlockedDatesForMonth(year: number, month: number): Observable<BlockedDateDto[]> {
    return this.http.get<BlockedDateDto[]>(`${this.baseUrl}/month/${year}/${month}`).pipe(
      catchError(this.handleError)
    );
  }

  // Check if a specific date is blocked
  isDateBlocked(date: string): Observable<{ blocked: boolean; reason?: string }> {
    return this.http.get<{ blocked: boolean; reason?: string }>(`${this.baseUrl}/check/${date}`).pipe(
      catchError(this.handleError)
    );
  }

  // Create a new blocked date
  createBlockedDate(blockedDate: Partial<BlockedDateDto>): Observable<BlockedDateResponse> {
    return this.http.post<BlockedDateResponse>(this.baseUrl, blockedDate).pipe(
      catchError(this.handleError)
    );
  }

  // Update a blocked date
  updateBlockedDate(id: string, blockedDate: Partial<BlockedDateDto>): Observable<BlockedDateResponse> {
    return this.http.put<BlockedDateResponse>(`${this.baseUrl}/${id}`, blockedDate).pipe(
      catchError(this.handleError)
    );
  }

  // Delete a blocked date
  deleteBlockedDate(id: string): Observable<BlockedDateResponse> {
    return this.http.delete<BlockedDateResponse>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Block a specific date
  blockDate(date: string, reason?: string): Observable<BlockedDateResponse> {
    return this.createBlockedDate({
      date,
      reason: reason || 'Day blocked off',
      createdBy: 'current-user', // This should be replaced with actual user ID
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Unblock a specific date
  unblockDate(date: string): Observable<BlockedDateResponse> {
    return this.http.delete<BlockedDateResponse>(`${this.baseUrl}/date/${date}`).pipe(
      catchError(this.handleError)
    );
  }

  // Get blocked dates for a date range
  getBlockedDatesInRange(startDate: string, endDate: string): Observable<BlockedDateDto[]> {
    return this.http.get<BlockedDateDto[]>(`${this.baseUrl}/range?start=${startDate}&end=${endDate}`).pipe(
      catchError(this.handleError)
    );
  }
}
