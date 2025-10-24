import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppointmentService, AppointmentDto } from '../appointment.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-user-appointments',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, RouterLink],
  templateUrl: './user-appointments.component.html',
  styleUrl: './user-appointments.component.css'
})
export class UserAppointmentsComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly authService = inject(AuthService);

  appointments: AppointmentDto[] = [];
  loading = true;
  errorMessage: string | null = null;
  currentUser = this.authService.currentUser;
  
  // Animation and interaction states
  isAnimating = false;
  hoveredCard: string | null = null;
  successMessage: string | null = null;

  ngOnInit(): void {
    this.loadUserAppointments();
  }

  loadUserAppointments(): void {
    this.loading = true;
    this.errorMessage = null;

    const currentUser = this.currentUser();
    console.log('=== AUTH DEBUG ===');
    console.log('Current user object:', currentUser);
    console.log('User ID:', currentUser?.id);
    console.log('User email:', currentUser?.email);
    console.log('Is authenticated:', this.authService.isAuthenticated());
    
    if (!currentUser?.id) {
      console.error('No user ID found - user object:', currentUser);
      this.loading = false;
      this.errorMessage = 'User not logged in or missing user ID';
      return;
    }

    console.log('=== USER APPOINTMENTS DEBUG ===');
    console.log('Current user:', currentUser);
    console.log('User ID:', currentUser.id);
    console.log('User email:', currentUser.email);

    // Get all appointments and filter by user ID (backend endpoint not available)
    console.log('Getting all appointments and filtering by user ID...');
    this.appointmentService.getAppointments().subscribe({
      next: (allAppointments) => {
        console.log('All appointments from backend:', allAppointments);
        console.log('Looking for user ID:', currentUser.id);
        
        // Filter appointments by user ID
        const userAppointments = allAppointments.filter(appointment => {
          const matches = appointment.userId === currentUser.id;
          console.log(`Appointment ${appointment._id}: userId=${appointment.userId}, matches=${matches}`);
          return matches;
        });
        
        console.log('Filtered appointments for user:', userAppointments);
        console.log('Number of appointments found:', userAppointments.length);
        
        this.appointments = this.processAppointments(userAppointments);
        console.log('Processed appointments:', this.appointments);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
        console.error('Error details:', err);
        
        // Fallback: try to get all appointments and filter by email
        console.log('Falling back to email filtering...');
        this.loadUserAppointmentsByEmail();
      }
    });
  }

  private processAppointments(appointments: AppointmentDto[]): AppointmentDto[] {
    console.log('=== PROCESSING APPOINTMENTS (USER VIEW) ===');
    console.log('Raw appointments:', appointments);
    console.log('Current time:', new Date().toISOString());
    
    const processed = (appointments ?? [])
      .filter(appointment => {
        // Only show upcoming appointments for the user
        const appointmentDate = new Date(appointment.date);
        const now = new Date();
        const isFuture = appointmentDate > now;
        
        console.log(`Appointment ${appointment._id}:`, {
          date: appointment.date,
          appointmentDate: appointmentDate.toISOString(),
          now: now.toISOString(),
          isFuture: isFuture,
          title: appointment.title,
          userId: appointment.userId
        });
        
        // Only show upcoming appointments
        return isFuture;
      })
      .sort((a, b) => {
        // Sort by date/time - closest upcoming appointments first
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime(); // Closest appointments first
      });
    
    console.log('Processed appointments (upcoming only):', processed);
    console.log('Number of upcoming appointments:', processed.length);
    return processed;
  }

  getServiceInfo(appointment: AppointmentDto): { name: string; price: string } {
    const description = appointment.description || '';
    const serviceMatch = description.match(/Service: ([^,]+)/);
    const priceMatch = description.match(/Price: €(\d+)/);
    
    return {
      name: serviceMatch ? serviceMatch[1] : 'Unknown Service',
      price: priceMatch ? `€${priceMatch[1]}` : 'N/A'
    };
  }

  getClientNotes(appointment: AppointmentDto): string | null {
    const description = appointment.description || '';
    
    // Look for "Client Notes:" in the description
    const notesMatch = description.match(/Client Notes:\s*(.+)/s);
    
    if (notesMatch && notesMatch[1].trim()) {
      return notesMatch[1].trim();
    }
    
    return null;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTotalAppointments(): number {
    return this.appointments.length;
  }

  // Cancel appointment with enhanced UX
  cancelAppointment(appointment: AppointmentDto): void {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    const isWithin24Hours = this.isWithin24Hours(appointment);
    
    console.log('Cancelling appointment:', appointment._id);
    
    this.appointmentService.deleteAppointment(appointment._id!).subscribe({
      next: (response: { message: string }) => {
        console.log('Appointment cancelled successfully:', response);
        
        // Add animation delay before removing the appointment
        setTimeout(() => {
          // Remove the cancelled appointment from the list
          this.appointments = this.appointments.filter(apt => apt._id !== appointment._id);
          
          // Show success message with animation
          this.showSuccessMessage('Your appointment has been cancelled successfully! 💅');
          this.isAnimating = false;
        }, 500);
      },
      error: (err: any) => {
        console.error('Error cancelling appointment:', err);
        
        // Handle offline mode - remove appointment locally
        if (err.status === 0 || err.message?.includes('CORS') || err.message?.includes('Failed to fetch')) {
          console.log('Backend unavailable, removing appointment locally');
          setTimeout(() => {
            this.appointments = this.appointments.filter(apt => apt._id !== appointment._id);
            this.showSuccessMessage('Your appointment has been cancelled successfully! 💅 (Offline mode)');
            this.isAnimating = false;
          }, 500);
        } else {
          this.showErrorMessage('Failed to cancel appointment. Please try again or contact support.');
          this.isAnimating = false;
        }
      }
    });
  }

  // Check if appointment can be cancelled (always allow cancellation)
  canCancelAppointment(appointment: AppointmentDto): boolean {
    // Allow cancellation of ANY appointment at any time
    return true;
  }

  // Check if appointment is within 24 hours (for future cancellation fee logic)
  isWithin24Hours(appointment: AppointmentDto): boolean {
    const appointmentDate = new Date(appointment.date);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilAppointment <= 24 && hoursUntilAppointment > 0;
  }


  private loadUserAppointmentsByEmail(): void {
    const userEmail = this.currentUser()?.email;
    if (!userEmail) {
      console.error('No user email found');
      this.loading = false;
      this.errorMessage = 'User not logged in';
      return;
    }

    console.log('Loading appointments by email:', userEmail);

    // Fallback to old method - get all appointments and filter by email
    this.appointmentService.getAppointments().subscribe({
      next: (allAppointments) => {
        console.log('All appointments:', allAppointments.length);
        
        // Filter appointments for the current user by email
        const userAppointments = allAppointments.filter(appointment => {
          const hasUser = appointment.attendees.some(attendee => attendee.email === userEmail);
          console.log('Appointment:', appointment.title, 'Has user:', hasUser);
          return hasUser;
        });
        
        console.log('User appointments by email:', userAppointments.length);
        
        this.appointments = this.processAppointments(userAppointments);
        console.log('Final filtered appointments:', this.appointments);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to load appointments';
      }
    });
  }

  // Enhanced UX methods
  showSuccessMessage(message: string): void {
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = null;
    }, 4000);
  }

  showErrorMessage(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = null;
    }, 5000);
  }

  clearMessage(): void {
    this.successMessage = null;
    this.errorMessage = null;
  }

  onCardHover(appointmentId: string): void {
    if (!this.isAnimating) {
      this.hoveredCard = appointmentId;
    }
  }

  onCardLeave(): void {
    if (!this.isAnimating) {
      this.hoveredCard = null;
    }
  }

  // Enhanced date formatting with relative time
  getRelativeTime(date: string): string {
    const appointmentDate = new Date(date);
    const now = new Date();
    const diffInHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Less than 1 hour';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours`;
    } else if (diffInHours < 48) {
      return 'Tomorrow';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days`;
    }
  }

  // Get appointment urgency level
  getUrgencyLevel(appointment: AppointmentDto): 'low' | 'medium' | 'high' {
    const appointmentDate = new Date(appointment.date);
    const now = new Date();
    const diffInHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) return 'high';
    if (diffInHours < 72) return 'medium';
    return 'low';
  }
}