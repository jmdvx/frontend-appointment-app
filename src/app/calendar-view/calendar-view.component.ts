import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AppointmentService, AppointmentDto } from '../appointment.service';
import { BlockedDatesService, BlockedDateDto } from '../blocked-dates.service';
import { ClientService } from '../client.service';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, ReactiveFormsModule],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.css'
})
export class CalendarViewComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly blockedDatesService = inject(BlockedDatesService);
  private readonly clientService = inject(ClientService);
  private readonly fb = inject(FormBuilder);

  appointments: AppointmentDto[] = [];
  blockedDates: BlockedDateDto[] = [];
  loading = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // Calendar state
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();
  
  // Expanded day state
  expandedDay: CalendarDay | null = null;
  
  // Action states
  deletingAppointmentId: string | null = null;
  cancelingAppointmentId: string | null = null;
  reschedulingAppointmentId: string | null = null;
  
  // Reschedule form
  rescheduleForm: FormGroup;
  rescheduleAppointmentId: string | null = null;
  showRescheduleForm = false;
  
  // Walk-in booking state
  showWalkInModal = false;
  walkInForm: FormGroup;
  isSubmittingWalkIn = false;
  availableTimes: string[] = [];
  availableServices: any[] = [];
  
  
  // Calendar data
  calendarDays: CalendarDay[] = [];
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor() {
    this.walkInForm = this.fb.group({
      clientName: ['', [Validators.required, Validators.minLength(2)]],
      clientEmail: ['', [Validators.required, Validators.email]],
      clientPhone: ['', [Validators.required, Validators.pattern(/^08[0-9]\d{7}$/)]],
      selectedDate: ['', Validators.required],
      selectedTime: ['', Validators.required],
      service: ['', Validators.required],
      notes: [''],
      createAccount: [false]
    });
    
    this.rescheduleForm = this.fb.group({
      date: ['', Validators.required],
      time: ['', Validators.required]
    });
    
    // Watch for date changes and reset time selection
    this.walkInForm.get('selectedDate')?.valueChanges.subscribe(selectedDate => {
      // Reset time when date changes
      this.walkInForm.get('selectedTime')?.setValue('');
    });
    
    // Watch for reschedule date changes and reset time selection
    this.rescheduleForm.get('date')?.valueChanges.subscribe(selectedDate => {
      // Reset time when date changes
      this.rescheduleForm.get('time')?.setValue('');
    });
    
    this.initializeAvailableTimes();
    this.initializeAvailableServices();
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = null;
    this.appointmentService.getAppointments().subscribe({
      next: (appointments) => {
        this.appointments = this.processAppointments(appointments);
        this.loadBlockedDates();
      },
      error: (err) => {
        console.error('❌ Error loading appointments:', err);
        this.appointments = [];
        this.loadBlockedDates();
      }
    });
  }

  loadBlockedDates(): void {
    this.blockedDatesService.getBlockedDatesForMonth(this.currentYear, this.currentMonth + 1).subscribe({
      next: (blockedDates) => {
        this.blockedDates = blockedDates;
        this.generateCalendar();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading blocked dates:', err);
        this.blockedDates = [];
        this.generateCalendar();
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to load calendar data';
      }
    });
  }


  loadAppointments(): void {
    this.loading = true;
    this.errorMessage = null;
    
    console.log('=== CALENDAR LOADING APPOINTMENTS ===');
    this.appointmentService.getAppointments().subscribe({
      next: (appointments) => {
        console.log('✅ Calendar appointments loaded:', appointments);
        console.log('Number of appointments:', appointments.length);
        this.appointments = this.processAppointments(appointments);
        console.log('Processed appointments:', this.appointments);
        this.generateCalendar();
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error loading appointments:', err);
        console.error('Error details:', err);
        this.appointments = [];
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to load appointments';
      }
    });
  }

  private processAppointments(appointments: AppointmentDto[]): AppointmentDto[] {
    const processed = (appointments ?? [])
      .filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        const now = new Date();
        
        // Calculate start of today
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0); // Start of day
        
        // Only show appointments from today onward
        const shouldShow = appointmentDate >= startOfToday;
        
        console.log(`Calendar Appointment ${appointment._id}:`, {
          date: appointment.date,
          appointmentDate: appointmentDate.toISOString(),
          now: now.toISOString(),
          startOfToday: startOfToday.toISOString(),
          shouldShow: shouldShow,
          title: appointment.title
        });
        
        return shouldShow;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
    
    return processed;
  }

  generateCalendar(): void {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    this.calendarDays = [];
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayAppointments = this.getAppointmentsForDate(date);
      const blockedDateInfo = this.getBlockedDateInfo(date);
      
      console.log(`Day ${i}: ${date.toDateString()} - ${dayAppointments.length} appointments`);
      
      this.calendarDays.push({
        date: new Date(date),
        appointments: dayAppointments,
        isCurrentMonth: date.getMonth() === this.currentMonth,
        isToday: this.isToday(date),
        isPast: date < new Date(new Date().setHours(0, 0, 0, 0)),
        isBlocked: blockedDateInfo.isBlocked,
        blockedReason: blockedDateInfo.reason
      });
    }
  }

  getAppointmentsForDate(date: Date): AppointmentDto[] {
    const dayAppointments = this.appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      const matches = appointmentDate.toDateString() === date.toDateString();
      
      return matches;
    });
    
    return dayAppointments;
  }

  getBlockedDateInfo(date: Date): { isBlocked: boolean; reason?: string } {
    const dateString = this.formatDateToString(date); // YYYY-MM-DD format (timezone-safe)
    const blockedDate = this.blockedDates.find(blocked => blocked.date === dateString);
    
    return {
      isBlocked: !!blockedDate,
      reason: blockedDate?.reason
    };
  }

  // Helper method to format date to YYYY-MM-DD string (timezone-safe)
  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  // Navigation
  previousMonth(): void {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.loadBlockedDates();
  }

  nextMonth(): void {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.loadBlockedDates();
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();
    this.loadBlockedDates();
  }

  // Get month/year display
  getMonthYearDisplay(): string {
    return `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
  }

  // Get service info
  getServiceInfo(appointment: AppointmentDto): { name: string; price: string } {
    const description = appointment.description || '';
    const serviceMatch = description.match(/Service: ([^,]+)/);
    const priceMatch = description.match(/Price: €(\d+)/);
    
    return {
      name: serviceMatch ? serviceMatch[1] : 'Unknown Service',
      price: priceMatch ? `€${priceMatch[1]}` : 'N/A'
    };
  }

  // Format time
  formatTime(date: string): string {
    const formattedTime = new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    console.log(`🕐 Formatting time: ${date} -> ${formattedTime}`);
    return formattedTime;
  }

  // Get total appointments for month
  getTotalAppointmentsForMonth(): number {
    return this.appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.getMonth() === this.currentMonth && 
             appointmentDate.getFullYear() === this.currentYear;
    }).length;
  }

  // Get appointments count for a day
  getAppointmentsCountForDay(day: CalendarDay): number {
    return day.appointments.length;
  }

  // Check if day has appointments
  hasAppointments(day: CalendarDay): boolean {
    return day.appointments.length > 0;
  }

  // Day expansion methods
  toggleDayExpansion(day: CalendarDay): void {
    if (this.expandedDay && this.expandedDay.date.getTime() === day.date.getTime()) {
      this.expandedDay = null;
    } else {
      this.expandedDay = day;
    }
  }

  isDayExpanded(day: CalendarDay): boolean {
    return this.expandedDay !== null && this.expandedDay.date.getTime() === day.date.getTime();
  }

  closeExpandedDay(): void {
    this.expandedDay = null;
  }

  // Format date for display
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Appointment action methods
  deleteAppointment(appointmentId: string): void {
    this.deletingAppointmentId = appointmentId;
    
    this.appointmentService.deleteAppointment(appointmentId).subscribe({
      next: (response) => {
        console.log('Appointment deleted:', response);
        // Remove appointment immediately from UI
        this.appointments = this.appointments.filter(apt => apt._id !== appointmentId);
        this.deletingAppointmentId = null;
        this.successMessage = 'Appointment deleted successfully!';
        setTimeout(() => this.successMessage = null, 3000);
        // Try to reload appointments (but don't wait for it)
        this.loadAppointments();
      },
      error: (err) => {
        console.error('Error deleting appointment:', err);
        
        // Handle offline mode - remove appointment locally
        if (err.status === 0 || err.message?.includes('CORS') || err.message?.includes('Failed to fetch')) {
          console.log('Backend unavailable, removing appointment locally');
          this.appointments = this.appointments.filter(apt => apt._id !== appointmentId);
          this.deletingAppointmentId = null;
          this.successMessage = 'Appointment deleted successfully! (Offline mode)';
          setTimeout(() => this.successMessage = null, 3000);
        } else {
          this.deletingAppointmentId = null;
          alert('Failed to delete appointment. Please try again.');
        }
      }
    });
  }

  cancelAppointment(appointmentId: string): void {
    this.cancelingAppointmentId = appointmentId;
    
    // For now, we'll use delete as cancel (you can implement a separate cancel status later)
    this.appointmentService.deleteAppointment(appointmentId).subscribe({
      next: (response) => {
        console.log('Appointment canceled:', response);
        // Remove appointment immediately from UI
        this.appointments = this.appointments.filter(apt => apt._id !== appointmentId);
        this.cancelingAppointmentId = null;
        this.successMessage = 'Appointment canceled successfully!';
        setTimeout(() => this.successMessage = null, 3000);
        // Try to reload appointments (but don't wait for it)
        this.loadAppointments();
      },
      error: (err) => {
        console.error('Error canceling appointment:', err);
        
        // Handle offline mode - remove appointment locally
        if (err.status === 0 || err.message?.includes('CORS') || err.message?.includes('Failed to fetch')) {
          console.log('Backend unavailable, removing appointment locally');
          this.appointments = this.appointments.filter(apt => apt._id !== appointmentId);
          this.cancelingAppointmentId = null;
          this.successMessage = 'Appointment canceled successfully! (Offline mode)';
          setTimeout(() => this.successMessage = null, 3000);
        } else {
          this.cancelingAppointmentId = null;
          alert('Failed to cancel appointment. Please try again.');
        }
      }
    });
  }

  rescheduleAppointment(appointmentId: string): void {
    this.rescheduleAppointmentId = appointmentId;
    this.showRescheduleForm = true;
    
    // Find the appointment to pre-populate the form
    const appointment = this.appointments.find(apt => apt._id === appointmentId);
    if (appointment) {
      const currentDate = new Date(appointment.date);
      const dateStr = currentDate.toISOString().split('T')[0];
      const timeStr = currentDate.toTimeString().split(' ')[0].substring(0, 5);
      
      this.rescheduleForm.patchValue({
        date: dateStr,
        time: timeStr
      });
    }
  }

  // Start reschedule process
  startReschedule(appointment: AppointmentDto): void {
    this.rescheduleAppointment(appointment._id!);
  }

  // Cancel reschedule
  cancelReschedule(): void {
    this.showRescheduleForm = false;
    this.rescheduleAppointmentId = null;
    this.rescheduleForm.reset();
  }

  // Submit reschedule
  submitReschedule(): void {
    if (!this.rescheduleForm.valid || !this.rescheduleAppointmentId) {
      return;
    }

    const { date, time } = this.rescheduleForm.value;
    const newDateTime = new Date(`${date}T${time}:00`);
    
    this.reschedulingAppointmentId = this.rescheduleAppointmentId;
    
    this.appointmentService.updateAppointment(this.rescheduleAppointmentId, {
      date: newDateTime.toISOString()
    }).subscribe({
      next: (response) => {
        console.log('Appointment rescheduled:', response);
        this.loadAppointments(); // Reload appointments
        this.cancelReschedule();
        this.reschedulingAppointmentId = null;
        this.successMessage = 'Appointment rescheduled successfully!';
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        console.error('Error rescheduling appointment:', err);
        this.reschedulingAppointmentId = null;
        alert('Failed to reschedule appointment. Please try again.');
      }
    });
  }

  // Generate available time slots for reschedule
  getAvailableTimeSlots(): string[] {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }

  // Get available time slots for a specific date (excluding already booked times)
  getAvailableTimeSlotsForRescheduleDate(selectedDate: string): string[] {
    if (!selectedDate) {
      return this.getAvailableTimeSlots();
    }

    // Get all time slots
    const allSlots = this.getAvailableTimeSlots();
    
    // Find appointments on the selected date
    const appointmentsOnDate = this.appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      const selectedDateObj = new Date(selectedDate);
      
      // Check if it's the same date (ignoring time)
      return appointmentDate.toDateString() === selectedDateObj.toDateString();
    });

    // Get booked time slots
    const bookedSlots = appointmentsOnDate.map(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.toTimeString().split(' ')[0].substring(0, 5);
    });

    // Filter out booked slots
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
    
    return availableSlots;
  }

  // Check if a specific date/time combination is available for reschedule
  isTimeSlotAvailableForReschedule(date: string, time: string): boolean {
    if (!date || !time) return true;

    const selectedDateTime = new Date(`${date}T${time}:00`);
    
    // Check if any appointment exists at this exact time (excluding the current appointment being rescheduled)
    return !this.appointments.some(appointment => {
      if (appointment._id === this.rescheduleAppointmentId) {
        return false; // Don't consider the appointment being rescheduled
      }
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.getTime() === selectedDateTime.getTime();
    });
  }

  // Get current date string for min date validation
  getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0];
  }


  // Helper methods for action states
  isDeletingAppointment(appointmentId: string): boolean {
    return this.deletingAppointmentId === appointmentId;
  }

  isCancelingAppointment(appointmentId: string): boolean {
    return this.cancelingAppointmentId === appointmentId;
  }

  isReschedulingAppointment(appointmentId: string): boolean {
    return this.reschedulingAppointmentId === appointmentId;
  }

  // Block/unblock date methods
  toggleDateBlock(day: CalendarDay): void {
    if (day.isBlocked) {
      this.unblockDate(day);
    } else {
      this.blockDate(day);
    }
  }

  blockDate(day: CalendarDay): void {
    const dateString = this.formatDateToString(day.date);
    const reason = prompt('Enter reason for blocking this day (optional):') || 'Day blocked off';
    
    this.blockedDatesService.blockDate(dateString, reason).subscribe({
      next: (response) => {
        console.log('Date blocked successfully:', response);
        // Add to local blocked dates array for immediate UI update
        this.blockedDates.push({
          date: dateString,
          reason: reason,
          createdBy: 'current-user',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        this.generateCalendar(); // Update the calendar immediately
        this.successMessage = `Date ${dateString} blocked successfully!`;
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        console.error('Error blocking date:', err);
        alert('Failed to block date. Please try again.');
      }
    });
  }

  unblockDate(day: CalendarDay): void {
    const dateString = this.formatDateToString(day.date);
    
    this.blockedDatesService.unblockDate(dateString).subscribe({
      next: (response) => {
        console.log('Date unblocked successfully:', response);
        // Remove from local blocked dates array for immediate UI update
        this.blockedDates = this.blockedDates.filter(bd => bd.date !== dateString);
        this.generateCalendar(); // Update the calendar immediately
        this.successMessage = `Date ${dateString} unblocked successfully!`;
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        console.error('Error unblocking date:', err);
        alert('Failed to unblock date. Please try again.');
      }
    });
  }

  // Check if day can be clicked (not past dates)
  canInteractWithDay(day: CalendarDay): boolean {
    return !day.isPast;
  }

  // Walk-in booking methods
  openWalkInBooking(): void {
    this.showWalkInModal = true;
    this.walkInForm.patchValue({
      selectedDate: this.getTodayDate()
    });
  }

  openWalkInBookingForDay(day: CalendarDay): void {
    this.showWalkInModal = true;
    this.expandedDay = null; // Close the calendar day details
    this.walkInForm.patchValue({
      selectedDate: this.formatDateForInput(day.date)
    });
  }

  closeWalkInModal(): void {
    this.showWalkInModal = false;
    this.walkInForm.reset();
    this.isSubmittingWalkIn = false;
  }

  initializeAvailableTimes(): void {
    const times = [];
    for (let hour = 9; hour <= 17; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    this.availableTimes = times;
  }

  initializeAvailableServices(): void {
    this.availableServices = [
      { id: 'manicure', name: 'Manicure', price: '€25' },
      { id: 'pedicure', name: 'Pedicure', price: '€30' },
      { id: 'gel-polish', name: 'Gel Polish', price: '€35' },
      { id: 'nail-art', name: 'Nail Art', price: '€40' },
      { id: 'full-set', name: 'Full Set', price: '€45' },
      { id: 'refill', name: 'Refill', price: '€20' }
    ];
  }

  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateForInput(date: Date): string {
    // Use local date to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    console.log(`📅 Formatting date for input: ${date.toDateString()} -> ${year}-${month}-${day}`);
    return `${year}-${month}-${day}`;
  }

  getFieldError(fieldName: string): string | null {
    const field = this.walkInForm.get(fieldName);
    if (field && field.invalid && field.touched) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors?.['pattern']) {
        return 'Please enter a valid phone number (e.g., 0833866364)';
      }
      if (field.errors?.['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
    }
    return null;
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'clientName': 'Full Name',
      'clientEmail': 'Email Address',
      'clientPhone': 'Phone Number',
      'selectedDate': 'Date',
      'selectedTime': 'Time',
      'service': 'Service'
    };
    return labels[fieldName] || fieldName;
  }

  onCreateAccountToggle(event: any): void {
    // This method can be used to show/hide additional fields if needed
    console.log('Create account toggle:', event.target.checked);
  }

  submitWalkInBooking(): void {
    if (!this.walkInForm.valid) {
      this.walkInForm.markAllAsTouched();
      return;
    }

    const formData = this.walkInForm.value;
    
    // Check if the selected date has any available time slots
    if (!this.hasAvailableTimeSlots(formData.selectedDate)) {
      alert('Sorry, this date has no available time slots for walk-in bookings. All time slots are already booked. Please select a different date.');
      this.walkInForm.get('selectedDate')?.setValue('');
      this.walkInForm.get('selectedTime')?.setValue('');
      return;
    }
    
    // Check if the selected time slot is still available
    if (!this.isTimeSlotAvailable(formData.selectedDate, formData.selectedTime)) {
      alert('Sorry, this time slot has just been booked by someone else. Please select a different time.');
      this.walkInForm.get('selectedTime')?.setValue('');
      return;
    }

    this.isSubmittingWalkIn = true;

    // Create appointment data
    const appointmentData = {
      userId: 'walk-in-client', // Temporary ID for walk-in clients
      title: `${formData.service} - ${formData.clientName}`,
      description: `Name: ${formData.clientName}, Email: ${formData.clientEmail}, Phone: ${formData.clientPhone}, Date: ${formData.selectedDate}, Time: ${formData.selectedTime}, Service: ${this.getServiceName(formData.service)}, Price: ${this.getServicePrice(formData.service)}${formData.notes ? `, Notes: ${formData.notes}` : ''}`,
      date: new Date(`${formData.selectedDate}T${formData.selectedTime}:00`).toISOString(),
      location: 'Nail Studio',
      attendees: [{
        name: formData.clientName,
        email: formData.clientEmail,
        phone: formData.clientPhone,
        rsvp: 'yes' as const
      }]
    };

    // Always create the appointment first to block the time slot
    this.appointmentService.createAppointment(appointmentData).subscribe({
      next: (response) => {
        console.log('✅ Walk-in appointment created successfully:', response);
        console.log('📅 Appointment data sent:', appointmentData);
        
        // If createAccount is checked, also create a client account
        if (formData.createAccount) {
          this.createClientAccount(formData, response);
        } else {
          // Just show success message - appointment is already created and time slot blocked
          this.handleBookingSuccess();
        }
      },
      error: (err) => {
        console.error('❌ Error creating walk-in appointment:', err);
        console.error('📅 Appointment data that failed:', appointmentData);
        this.isSubmittingWalkIn = false;
        alert('Failed to book appointment. Please try again.');
      }
    });
  }

  createClientAccount(clientData: any, appointmentResponse: any): void {
    const clientAccountData = {
      name: clientData.clientName,
      email: clientData.clientEmail,
      phone: clientData.clientPhone,
      role: 'user',
      preferences: {
        favoriteServices: [clientData.service],
        preferredTimes: [clientData.selectedTime],
        allergies: [], // Changed from string to array
        specialRequests: clientData.notes || ''
      }
    };

    this.clientService.createClient(clientAccountData).subscribe({
      next: (response) => {
        console.log('Client account created:', response);
        this.handleBookingSuccess();
      },
      error: (err) => {
        console.error('Error creating client account:', err);
        // Still show success for appointment booking even if account creation fails
        this.handleBookingSuccess();
      }
    });
  }

  handleBookingSuccess(): void {
    this.isSubmittingWalkIn = false;
    this.closeWalkInModal();
    console.log('🔄 Reloading calendar data after walk-in booking...');
    
    // Force immediate reload and then reload again after delay
    this.loadData(); // Immediate reload
    
    // Add a small delay to ensure backend has processed the appointment
    setTimeout(() => {
      console.log('🔄 Second reload after delay...');
      this.loadData(); // Second reload after delay
    }, 1000);
    
    this.successMessage = 'Walk-in appointment booked successfully! Time slot is now reserved.';
    setTimeout(() => this.successMessage = null, 5000);
  }

  // Force refresh calendar data
  forceRefreshCalendar(): void {
    console.log('🔄 Force refreshing calendar...');
    this.loadData();
  }

  // Check if a date has any available time slots for walk-ins
  hasAvailableTimeSlots(date: string): boolean {
    const availableSlots = this.getAvailableTimeSlotsForDate(date);
    const hasSlots = availableSlots.length > 0;
    
    console.log(`📅 Date ${date} has ${availableSlots.length} available time slots for walk-ins`);
    return hasSlots;
  }

  // Get booked time slots for a specific date
  getBookedTimeSlots(date: string): string[] {
    const targetDate = new Date(date);
    const bookedSlots: string[] = [];
    
    this.appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.date);
      
      // Check if appointment is on the same date
      if (appointmentDate.toDateString() === targetDate.toDateString()) {
        const timeSlot = appointmentDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
        bookedSlots.push(timeSlot);
      }
    });
    
    console.log(`📅 Booked time slots for ${date}:`, bookedSlots);
    return bookedSlots;
  }

  // Check if a time slot is available
  isTimeSlotAvailable(date: string, time: string): boolean {
    const bookedSlots = this.getBookedTimeSlots(date);
    const isAvailable = !bookedSlots.includes(time);
    console.log(`🕐 Time slot ${time} on ${date} is ${isAvailable ? 'available' : 'booked'}`);
    return isAvailable;
  }

  // Get available time slots for a specific date
  getAvailableTimeSlotsForDate(date: string): string[] {
    const bookedSlots = this.getBookedTimeSlots(date);
    const allSlots = this.availableTimes;
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
    
    console.log(`📅 Available time slots for ${date}:`, availableSlots);
    return availableSlots;
  }

  getServiceName(serviceId: string): string {
    const service = this.availableServices.find(s => s.id === serviceId);
    return service ? service.name : serviceId;
  }

  getServicePrice(serviceId: string): string {
    const service = this.availableServices.find(s => s.id === serviceId);
    return service ? service.price : '€0';
  }
}

export interface CalendarDay {
  date: Date;
  appointments: AppointmentDto[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isBlocked: boolean;
  blockedReason?: string;
}
