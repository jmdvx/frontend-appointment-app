import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';

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
  private readonly baseUrl = 'https://backend-appointment-app-wqo0.onrender.com/api/v1/blocked-dates';

  // Get all blocked dates
  getBlockedDates(): Observable<BlockedDateDto[]> {
    return this.http.get<BlockedDateDto[]>(this.baseUrl);
  }

  // Get blocked dates for a specific month
  getBlockedDatesForMonth(year: number, month: number): Observable<BlockedDateDto[]> {
    return this.http.get<BlockedDateDto[]>(`${this.baseUrl}/month/${year}/${month}`);
  }

  // Check if a specific date is blocked
  isDateBlocked(date: string): Observable<{ blocked: boolean; reason?: string }> {
    return this.http.get<{ blocked: boolean; reason?: string }>(`${this.baseUrl}/check/${date}`);
  }

  // Create a new blocked date
  createBlockedDate(blockedDate: Partial<BlockedDateDto>): Observable<BlockedDateResponse> {
    return this.http.post<BlockedDateResponse>(this.baseUrl, blockedDate);
  }

  // Update a blocked date
  updateBlockedDate(id: string, blockedDate: Partial<BlockedDateDto>): Observable<BlockedDateResponse> {
    return this.http.put<BlockedDateResponse>(`${this.baseUrl}/${id}`, blockedDate);
  }

  // Delete a blocked date
  deleteBlockedDate(id: string): Observable<BlockedDateResponse> {
    return this.http.delete<BlockedDateResponse>(`${this.baseUrl}/${id}`);
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
    return this.http.delete<BlockedDateResponse>(`${this.baseUrl}/date/${date}`);
  }

  // Get blocked dates for a date range
  getBlockedDatesInRange(startDate: string, endDate: string): Observable<BlockedDateDto[]> {
    return this.http.get<BlockedDateDto[]>(`${this.baseUrl}/range?start=${startDate}&end=${endDate}`);
  }
}
