import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, NgFor, NgIf, DatePipe, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppointmentService, AppointmentDto, AttendeeDto } from '../appointment.service';
import { BlockedDatesService } from '../blocked-dates.service';
import { AuthService } from '../auth.service';

interface NailService {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgFor, NgIf, DatePipe],
  templateUrl: './book-appointment.component.html',
  styleUrl: './book-appointment.component.css'
})
export class BookAppointmentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly appointmentService = inject(AppointmentService);
  private readonly blockedDatesService = inject(BlockedDatesService);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  selectedService: NailService | null = null;
  selectedDay: string | null = null;
  selectedTime: string | null = null;
  submitting = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  nextRotationTime: string = '';
  loadingService = true;

  availableDays: string[] = [];
  availableTimes: string[] = [];
  existingAppointments: any[] = [];
  blockedDates: string[] = [];
  
  // Day pagination properties
  displayedDays: string[] = [];
  showAllDays = false;
  daysPerPage = 5;

  form = this.fb.group({
    name: ['', [
      Validators.required, 
      Validators.minLength(2),
      Validators.maxLength(50),
      Validators.pattern(/^[a-zA-Z\s\-']+$/)
    ]],
    email: ['', [
      Validators.required, 
      Validators.email,
      Validators.maxLength(100)
    ]],
    phone: ['', [
      Validators.required, 
      Validators.pattern(/^[0-9\s\-\+\(\)]+$/), 
      Validators.minLength(8),
      Validators.maxLength(15)
    ]],
    description: ['', [
      Validators.maxLength(500)
    ]] // Optional description for nail preferences
  });

  ngOnInit(): void {
    // Check if user is logged in first
    if (!this.authService.isAuthenticated()) {
      if (isPlatformBrowser(this.platformId)) {
        alert('Please log in to book an appointment.');
      }
      this.router.navigate(['/login']);
      return;
    }

    // Only access localStorage in browser environment
    if (isPlatformBrowser(this.platformId)) {
      // Get selected service from localStorage
      const serviceStr = localStorage.getItem('selectedService');
      console.log('Service string from localStorage:', serviceStr);
      
      if (serviceStr) {
        try {
          this.selectedService = JSON.parse(serviceStr);
          console.log('Parsed selected service:', this.selectedService);
          this.loadingService = false;
        } catch (error) {
          console.error('Error parsing service from localStorage:', error);
          this.errorMessage = 'Error loading selected service. Please select a service again.';
          this.loadingService = false;
          this.router.navigate(['/services']);
          return;
        }
      } else {
        // If no service selected, redirect to services page
        console.log('No service found in localStorage, redirecting to services');
        this.loadingService = false;
        this.router.navigate(['/services']);
        return;
      }
    } else {
      // In SSR, redirect to services page
      this.router.navigate(['/services']);
      return;
    }
    
    // Auto-fill form with user information if logged in
    this.autoFillUserInfo();
    
    // Force refresh blocked dates to get latest from calendar
    this.forceRefreshBlockedDates();
    
    // Load existing appointments to check for conflicts
    this.loadExistingAppointments();
    
    // Set up interval to check for new slots every minute
    setInterval(() => {
      this.generateAvailableDays();
      this.loadExistingAppointments();
      this.loadBlockedDates();
    }, 30000); // Check every 30 seconds for faster updates
  }

  private generateAvailableDays(): void {
    console.log('=== GENERATING AVAILABLE DAYS (REDONE) ===');
    console.log('Current blocked dates:', this.blockedDates);
    
    const days: string[] = [];
    const now = new Date();
    
    // Check if it's after 8 PM - if so, skip tomorrow
    const isAfter8PM = now.getHours() >= 20; // 8 PM = 20:00
    const startDayOffset = isAfter8PM ? 2 : 1; // Start from day after tomorrow if after 8 PM
    
    console.log('Current time:', now.toLocaleString());
    console.log('Is after 8 PM:', isAfter8PM);
    console.log('Start day offset:', startDayOffset);
    
    // Generate 1 month of days (30 days total) starting from appropriate day
    const startDate = new Date(now);
    startDate.setDate(now.getDate() + startDayOffset);
    
    console.log('Start date:', startDate.toDateString());
    console.log('Today:', now.toDateString());
    
    // Generate 30 days (1 month)
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Create date string in YYYY-MM-DD format (timezone-safe)
      const dateString = this.formatDateToString(date);
      
      // Check if date is in the past
      const isPast = this.isDateInPast(date);
      
      // Check if it's today (no same-day bookings allowed)
      const isToday = this.isDateToday(date);
      
      // Check if date is blocked
      const isBlocked = this.isDateBlocked(dateString);
      
      // Check if it's tomorrow and after 8 PM (8 PM cutoff rule)
      const isTomorrowAfter8PM = this.isTomorrowAfter8PM(date);
      
      console.log(`Day ${i}: ${dateString} (${date.toDateString()}) - Past: ${isPast}, Today: ${isToday}, Blocked: ${isBlocked}, TomorrowAfter8PM: ${isTomorrowAfter8PM}`);
      
      // Only add if not past, not blocked, not today, and not tomorrow after 8 PM
      if (!isPast && !isBlocked && !isToday && !isTomorrowAfter8PM) {
        days.push(date.toISOString());
        console.log(`✅ Added: ${dateString}`);
      } else {
        console.log(`❌ Skipped: ${dateString} - Past: ${isPast}, Today: ${isToday}, Blocked: ${isBlocked}, TomorrowAfter8PM: ${isTomorrowAfter8PM}`);
      }
    }
    
    this.availableDays = days;
    console.log('Final available days count:', this.availableDays.length);
    
    this.updateDisplayedDays();
    this.calculateNextRotationTime();
    
    // Clear selected day if it's no longer available
    if (this.selectedDay && !this.availableDays.includes(this.selectedDay)) {
      this.selectedDay = null;
    }
  }

  // Helper method to format date to YYYY-MM-DD string (timezone-safe)
  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper method to check if date is in the past
  private isDateInPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  }

  // Helper method to check if date is today
  private isDateToday(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  }

  // Helper method to check if date is blocked
  private isDateBlocked(dateString: string): boolean {
    const isBlocked = this.blockedDates.includes(dateString);
    if (isBlocked) {
      console.log(`🔍 BLOCKED DATE: ${dateString}`);
    }
    return isBlocked;
  }

  // Helper method to check if it's tomorrow and after 8 PM (8 PM cutoff rule)
  private isTomorrowAfter8PM(date: Date): boolean {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    
    // Check if the date is tomorrow
    const isTomorrow = this.formatDateToString(date) === this.formatDateToString(tomorrow);
    
    // Check if current time is after 8 PM
    const isAfter8PM = now.getHours() >= 20; // 8 PM = 20:00
    
    const result = isTomorrow && isAfter8PM;
    
    if (result) {
      console.log(`🔍 TOMORROW AFTER 8 PM: ${this.formatDateToString(date)} - Current time: ${now.toLocaleTimeString()}`);
    }
    
    return result;
  }

  private getCurrentWeek(): Date[] {
    const today = new Date();
    const week: Date[] = [];
    
    // Find Monday of current week
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday start
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Generate Monday through Sunday
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      week.push(date);
    }
    
    return week;
  }

  private calculateNextRotationTime(): void {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour < 12) {
      // Next rotation is at 12pm today
      const nextRotation = new Date(now);
      nextRotation.setHours(12, 0, 0, 0);
      this.nextRotationTime = nextRotation.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      // Next rotation is at 12pm tomorrow
      const nextRotation = new Date(now);
      nextRotation.setDate(now.getDate() + 1);
      nextRotation.setHours(12, 0, 0, 0);
      this.nextRotationTime = `Tomorrow at ${nextRotation.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    }
  }

  selectDay(day: string) {
    console.log('Day selected:', day);
    console.log('Day type:', typeof day);
    
    // Check if the selected day is in the past
    const selectedDate = new Date(day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    if (selectedDate < today) {
      this.errorMessage = 'Cannot book appointments for past dates. Please select a future date.';
      console.log('Selected date is in the past:', selectedDate, 'Today:', today);
      return;
    }
    
    // Double-check that the day is not blocked before allowing selection
    const dateString = new Date(day).toISOString().split('T')[0];
    if (this.blockedDates.includes(dateString)) {
      this.errorMessage = 'This day is blocked and unavailable for appointments';
      return;
    }
    
    this.selectedDay = day;
    this.selectedTime = null; // Clear selected time when day changes
    this.generateAvailableTimes(day);
  }

  // Update displayed days based on pagination
  updateDisplayedDays(): void {
    if (this.showAllDays) {
      this.displayedDays = [...this.availableDays];
    } else {
      this.displayedDays = this.availableDays.slice(0, this.daysPerPage);
    }
  }

  // Toggle between showing limited and all days
  toggleShowMore(): void {
    this.showAllDays = !this.showAllDays;
    this.updateDisplayedDays();
  }

  selectTime(time: string) {
    console.log('Time selected:', time);
    console.log('Time type:', typeof time);
    this.selectedTime = time;
  }

  private generateAvailableTimes(day: string): void {
    const times: string[] = [];
    const selectedDate = new Date(day);
    const now = new Date();
    
    // Check if the selected day is today
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    // If it's today, no times available (no same-day bookings)
    if (isToday) {
      this.availableTimes = [];
      return;
    }
    
    // Get service duration in minutes (default to 60 minutes if no service selected)
    const serviceDurationMinutes = this.selectedService?.duration || 60;
    const serviceDurationHours = serviceDurationMinutes / 60;
    console.log('Service duration (minutes):', serviceDurationMinutes);
    console.log('Service duration (hours):', serviceDurationHours);
    console.log('Selected service:', this.selectedService);
    // Generate time slots from 11 AM to 6 PM based on service duration in minutes
    // Start at 11:00 AM (660 minutes from midnight)
    // End at 6:00 PM (1080 minutes from midnight)
    const startMinutes = 11 * 60; // 11:00 AM = 660 minutes
    const endMinutes = 18 * 60;   // 6:00 PM = 1080 minutes
    
    for (let minutes = startMinutes; minutes <= endMinutes; minutes += serviceDurationMinutes) {
      const timeSlot = new Date(selectedDate);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      timeSlot.setHours(hours, mins, 0, 0);
      times.push(timeSlot.toISOString());
      console.log('Added time slot:', timeSlot.toLocaleTimeString(), 'Minutes:', minutes);
    }
    
    // Filter out already booked times
    this.availableTimes = this.filterAvailableTimes(times, day);
  }

  private loadExistingAppointments(): void {
    console.log('=== LOADING EXISTING APPOINTMENTS ===');
    this.appointmentService.getAppointments().subscribe({
      next: (appointments) => {
        console.log('✅ Appointments loaded:', appointments);
        this.existingAppointments = appointments;
        // Regenerate available times if a day is selected
        if (this.selectedDay) {
          this.generateAvailableTimes(this.selectedDay);
        }
      },
      error: (err) => {
        console.error('❌ Failed to load existing appointments:', err);
        console.error('Error details:', err.error);
        console.error('Error status:', err.status);
        // Continue with all times available if we can't load appointments
      }
    });
  }

  private loadBlockedDates(): void {
    console.log('=== LOADING BLOCKED DATES (REDONE) ===');
    
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 1); // Include yesterday in case of timezone issues
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 35); // Include next 35 days to cover the full month
    
    const startDateString = this.formatDateToString(startDate);
    const endDateString = this.formatDateToString(endDate);
    
    console.log('Loading blocked dates from:', startDateString);
    console.log('Loading blocked dates to:', endDateString);
    
    this.blockedDatesService.getBlockedDatesInRange(startDateString, endDateString).subscribe({
      next: (blockedDates) => {
        console.log('✅ Blocked dates loaded successfully');
        console.log('Raw API response:', blockedDates);
        
        // Extract date strings from the response
        this.blockedDates = blockedDates.map(bd => bd.date).filter(date => date);
        
        console.log('Processed blocked dates:', this.blockedDates);
        console.log('Blocked dates count:', this.blockedDates.length);
        
        // Log each blocked date for debugging
        this.blockedDates.forEach((date, index) => {
          console.log(`  ${index + 1}. ${date}`);
        });
        
        // Regenerate available days with the new blocked dates
        this.generateAvailableDays();
      },
      error: (err) => {
        console.error('❌ Failed to load blocked dates:', err);
        this.blockedDates = [];
        this.generateAvailableDays();
      }
    });
  }


  private filterAvailableTimes(allTimes: string[], selectedDay: string): string[] {
    const selectedDate = new Date(selectedDay);
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Get appointments for the selected day
    const dayAppointments = this.existingAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate >= dayStart && appointmentDate <= dayEnd;
    });

    // Filter out times that are already booked
    return allTimes.filter(timeSlot => {
      const slotTime = new Date(timeSlot);
      
      // Check if this time slot conflicts with any existing appointment
      return !dayAppointments.some(appointment => {
        const appointmentTime = new Date(appointment.date);
        
        // Get the service duration from the appointment description or use default
        let appointmentDurationMinutes = 60; // Default to 1 hour
        
        // Try to extract duration from appointment description
        const description = appointment.description || '';
        const durationMatch = description.match(/Duration:\s*(\d+)\s*minutes?/i) || 
                           description.match(/Service:\s*([^,]+).*Duration:\s*(\d+)/i);
        
        if (durationMatch) {
          appointmentDurationMinutes = parseInt(durationMatch[1] || durationMatch[2]) || 60;
        }
        
        // Calculate appointment end time
        const appointmentEndTime = new Date(appointmentTime);
        appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + appointmentDurationMinutes);
        
        // Check if the time slot falls within the appointment duration
        const slotTimeMinutes = slotTime.getHours() * 60 + slotTime.getMinutes();
        const appointmentStartMinutes = appointmentTime.getHours() * 60 + appointmentTime.getMinutes();
        const appointmentEndMinutes = appointmentEndTime.getHours() * 60 + appointmentEndTime.getMinutes();
        
        // Check if slot is within appointment time range
        return slotTimeMinutes >= appointmentStartMinutes && slotTimeMinutes < appointmentEndMinutes;
      });
    });
  }

  // Get blocked days count for display
  getBlockedDaysCount(): number {
    console.log('🔍 Getting blocked days count:', this.blockedDates.length);
    console.log('🔍 Blocked dates array:', this.blockedDates);
    return this.blockedDates.length;
  }

  // Get formatted blocked dates for display
  getFormattedBlockedDates(): string[] {
    return this.blockedDates.map(dateString => {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    });
  }

  // Check if a specific day is blocked (public method for template)
  isDayBlocked(day: string): boolean {
    const date = new Date(day);
    const dateString = this.formatDateToString(date);
    return this.isDateBlocked(dateString);
  }

  // Check if booking is restricted due to same-day policy
  isBookingRestricted(): boolean {
    // Always show restriction notice since same-day bookings are not allowed
    return true;
  }

  // Get restriction message based on current time
  getRestrictionMessage(): string {
    const now = new Date();
    const isAfter8PM = now.getHours() >= 20;
    
    if (isAfter8PM) {
      return 'Same-day bookings are not allowed. Next-day bookings are not available after 8 PM.';
    } else {
      return 'Same-day bookings are not allowed.';
    }
  }

  // Force refresh blocked dates to get latest from calendar
  forceRefreshBlockedDates(): void {
    console.log('🔄 Force refreshing blocked dates from calendar...');
    // Clear current blocked dates first
    this.blockedDates = [];
    // Load fresh data from API
    this.loadBlockedDates();
  }





  // Force reload everything to ensure blocked dates are properly loaded
  forceReload(): void {
    console.log('🔄 Force reloading everything...');
    this.blockedDates = [];
    this.availableDays = [];
    this.loadBlockedDates();
  }


  // Refresh appointments data (useful after cancellations)
  refreshAppointments(): void {
    console.log('🔄 Refreshing appointments data...');
    this.loadExistingAppointments();
    this.successMessage = 'Appointments data refreshed! Available times updated.';
    setTimeout(() => this.successMessage = null, 3000);
  }

  // Auto-fill form with user information if logged in
  autoFillUserInfo(): void {
    const currentUser = this.authService.currentUser();
    
    if (currentUser && currentUser.email) {
      console.log('Auto-filling form with user information:', currentUser);
      
      // Pre-fill form with user data
      this.form.patchValue({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '' // Use phone from user data
      });
      
      // Show success message
      this.successMessage = 'Form pre-filled with your account information!';
      setTimeout(() => this.successMessage = null, 3000);
    } else {
      console.log('No user logged in - form will remain empty');
    }
  }

  // Clear form fields
  clearForm(): void {
    this.form.reset();
    this.successMessage = 'Form cleared! You can now enter new information.';
    setTimeout(() => this.successMessage = null, 3000);
  }

  // Navigate to services page
  goToServices(): void {
    this.router.navigate(['/services']);
  }

  // Change service (go back to services page)
  changeService(): void {
    // Clear the selected service from localStorage
    localStorage.removeItem('selectedService');
    this.selectedService = null;
    // Navigate to services page
    this.router.navigate(['/services']);
  }

  // Submit appointment booking form
  submit(): void {
    // Check if user is logged in
    if (!this.authService.isAuthenticated()) {
      if (isPlatformBrowser(this.platformId)) {
        alert('Please log in to book an appointment.');
      }
      this.router.navigate(['/login']);
      return;
    }

    // Validate form
    if (!this.form.valid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    // Check if service, day, and time are selected
    if (!this.selectedService || !this.selectedDay || !this.selectedTime) {
      this.errorMessage = 'Please select a service, day, and time for your appointment.';
      return;
    }

    // Check if the selected day is blocked
    if (this.isDayBlocked(this.selectedDay)) {
      this.errorMessage = 'The selected day is not available for booking.';
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    // Get current user
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.errorMessage = 'User not found. Please log in again.';
      this.submitting = false;
      return;
    }

    // Create appointment data
    console.log('Selected day:', this.selectedDay);
    console.log('Selected time:', this.selectedTime);
    
    // Validate date and time values
    if (!this.selectedDay || !this.selectedTime) {
      this.errorMessage = 'Please select both a day and time for your appointment.';
      this.submitting = false;
      return;
    }

    // Double-check that the selected day is not in the past
    const selectedDate = new Date(this.selectedDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      this.errorMessage = 'Cannot book appointments for past dates. Please select a future date.';
      this.submitting = false;
      return;
    }

    // Create proper date string
    let appointmentDate: string;
    try {
      // Since both selectedDay and selectedTime are ISO strings, we can use selectedTime directly
      // as it already contains the full date and time information
      const dateObj = new Date(this.selectedTime);
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date created from selected time');
      }
      
      appointmentDate = dateObj.toISOString();
      
    } catch (error) {
      console.error('Error creating appointment date:', error);
      this.errorMessage = 'Invalid date or time selected. Please try again.';
      this.submitting = false;
      return;
    }

    const appointmentData: AppointmentDto = {
      title: `${this.selectedService.name} - ${this.form.value.name}`,
      description: `Service: ${this.selectedService.name}, Price: €${this.selectedService.price}, Duration: ${this.selectedService.duration} minutes\nClient Notes: ${this.form.value.description || 'No special requests'}`,
      date: appointmentDate,
      location: "Katie's House",
      attendees: [
        {
          email: this.form.value.email,
          name: this.form.value.name,
          phone: this.form.value.phone,
          rsvp: 'yes'
        } as AttendeeDto
      ],
      userId: currentUser.id || '000000000000000000000000' // Fallback to default ID
    };

    console.log('Creating appointment:', appointmentData);

    // Submit appointment
    this.appointmentService.createAppointment(appointmentData).subscribe({
      next: (response) => {
        console.log('✅ Appointment created successfully:', response);
        this.successMessage = 'Appointment booked successfully! Redirecting to your appointments...';
        
        // Clear form and selections
        this.form.reset();
        this.selectedDay = null;
        this.selectedTime = null;
        localStorage.removeItem('selectedService');
        
        // Redirect to user appointments after 2 seconds
        setTimeout(() => {
          console.log('Redirecting to My Appointments page...');
          this.router.navigate(['/view-appointments-user']);
        }, 2000);
        
        this.submitting = false;
      },
      error: (err) => {
        console.error('❌ Failed to create appointment:', err);
        this.errorMessage = 'Failed to book appointment. Please try again.';
        this.submitting = false;
      }
    });
  }

  // Enhanced validation methods
  private validateForm(): boolean {
    if (!this.form.valid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      this.markFormGroupTouched();
      return false;
    }
    return true;
  }

  private validateSelectedDate(): boolean {
    if (!this.selectedDay) {
      this.errorMessage = 'Please select a date for your appointment.';
      return false;
    }

    const selectedDate = new Date(this.selectedDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      this.errorMessage = 'Cannot book appointments for past dates. Please select a future date.';
      return false;
    }

    // Check if date is too far in the future (e.g., more than 6 months)
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 6);
    if (selectedDate > maxDate) {
      this.errorMessage = 'Cannot book appointments more than 6 months in advance.';
      return false;
    }

    return true;
  }

  private validateTimeSlot(): boolean {
    if (!this.selectedTime) {
      this.errorMessage = 'Please select a time for your appointment.';
      return false;
    }

    // Check if the time slot is still available
    const timeSlot = this.selectedTime.split('T')[1]?.substring(0, 5);
    if (!this.availableTimes.includes(timeSlot)) {
      this.errorMessage = 'The selected time slot is no longer available. Please choose another time.';
      return false;
    }

    return true;
  }

  private createAppointmentData(currentUser: any): AppointmentDto | null {
    try {
      const dateObj = new Date(this.selectedTime!);
      
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date created from selected time');
      }
      
      const appointmentDate = dateObj.toISOString();
      
      return {
        title: `${this.selectedService!.name} - ${this.form.value.name}`,
        description: `Service: ${this.selectedService!.name}, Price: €${this.selectedService!.price}, Duration: ${this.selectedService!.duration} minutes\nClient Notes: ${this.form.value.description || 'No special requests'}`,
        date: appointmentDate,
        location: "Katie's House",
        attendees: [
          {
            email: this.form.value.email!,
            name: this.form.value.name!,
            phone: this.form.value.phone!,
            rsvp: 'yes'
          } as AttendeeDto
        ],
        userId: currentUser.id || '000000000000000000000000'
      };
    } catch (error) {
      console.error('Error creating appointment data:', error);
      this.errorMessage = 'Invalid date or time selected. Please try again.';
      return null;
    }
  }

  private createAppointment(appointmentData: AppointmentDto): void {
    this.appointmentService.createAppointment(appointmentData).subscribe({
      next: (response) => {
        this.successMessage = 'Appointment booked successfully! You will receive a confirmation email shortly.';
        
        // Clear form and selections
        this.form.reset();
        this.selectedDay = null;
        this.selectedTime = null;
        localStorage.removeItem('selectedService');
        
        // Redirect to user appointments after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/view-appointments-user']);
        }, 2000);
        
        this.submitting = false;
      },
      error: (err) => {
        console.error('❌ Failed to create appointment:', err);
        this.handleBookingError(err);
        this.submitting = false;
      }
    });
  }

  private handleBookingError(error: any): void {
    if (error.status === 409) {
      this.errorMessage = 'This time slot is no longer available. Please select another time.';
    } else if (error.status === 400) {
      this.errorMessage = 'Invalid appointment data. Please check your information and try again.';
    } else if (error.status === 401) {
      this.errorMessage = 'Your session has expired. Please log in again.';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } else if (error.status === 500) {
      this.errorMessage = 'Server error occurred. Please try again later.';
    } else if (error.status === 0) {
      this.errorMessage = 'Network error. Please check your internet connection and try again.';
    } else {
      this.errorMessage = 'Failed to book appointment. Please try again.';
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  // Get validation error messages
  getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
      }
      if (control.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must not exceed ${control.errors['maxlength'].requiredLength} characters`;
      }
      if (control.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (control.errors['pattern']) {
        if (fieldName === 'phone') {
          return 'Please enter a valid phone number';
        }
        if (fieldName === 'name') {
          return 'Name can only contain letters, spaces, hyphens, and apostrophes';
        }
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'name': 'Name',
      'email': 'Email',
      'phone': 'Phone number',
      'description': 'Description'
    };
    return labels[fieldName] || fieldName;
  }
}


