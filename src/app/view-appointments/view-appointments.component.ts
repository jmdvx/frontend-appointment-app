import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AppointmentService, AppointmentDto } from '../appointment.service';
import { ClientService, Client } from '../client.service';

@Component({
  selector: 'app-view-appointments',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, RouterLink, ReactiveFormsModule],
  templateUrl: './view-appointments.component.html',
  styleUrl: './view-appointments.component.css'
})
export class ViewAppointmentsComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly clientService = inject(ClientService);
  private readonly fb = inject(FormBuilder);

  appointments: AppointmentDto[] = [];
  loading = true;
  errorMessage: string | null = null;
  
  // Store clients for phone number lookup
  clients: Client[] = [];
  showAllAppointments = false; // Only show future appointments by default
  
  // Reschedule form
  rescheduleForm: FormGroup;
  rescheduleAppointmentId: string | null = null;
  showRescheduleForm = false;
  
  // Action states
  cancelingAppointmentId: string | null = null;
  reschedulingAppointmentId: string | null = null;

  constructor() {
    this.rescheduleForm = this.fb.group({
      date: ['', Validators.required],
      time: ['', Validators.required]
    });

    // Watch for date changes and reset time selection
    this.rescheduleForm.get('date')?.valueChanges.subscribe(selectedDate => {
      // Reset time when date changes
      this.rescheduleForm.get('time')?.setValue('');
    });
  }

  ngOnInit(): void {
    this.loadAppointments();
    this.loadClients();
  }

  loadClients(): void {
    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.clients = clients;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        this.clients = [];
      }
    });
  }

  loadAppointments(): void {
    this.loading = true;
    this.errorMessage = null;
    
    this.appointmentService.getAppointments().subscribe({
      next: (appointments) => {
        this.appointments = this.processAppointments(appointments);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
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
        
        // Only show appointments from today onward (same logic as calendar)
        const isFuture = appointmentDate >= startOfToday;
        
        console.log(`Appointment ${appointment._id}:`, {
          date: appointment.date,
          appointmentDate: appointmentDate.toISOString(),
          now: now.toISOString(),
          startOfToday: startOfToday.toISOString(),
          isFuture: isFuture,
          title: appointment.title
        });
        
        // If showAllAppointments is true, show all; otherwise only show future
        return this.showAllAppointments || isFuture;
      })
      .sort((a, b) => {
        // Sort by date/time - closest appointments first
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
    
    console.log('Processed appointments (future only):', processed);
    console.log('Number of future appointments:', processed.length);
    return processed;
  }

  // Toggle to show all appointments (including past ones)
  toggleShowAllAppointments(): void {
    this.showAllAppointments = !this.showAllAppointments;
    this.loadAppointments(); // Reload to apply new filter
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

  getClientName(appointment: AppointmentDto): string {
    if (appointment.attendees && appointment.attendees.length > 0) {
      return appointment.attendees[0].name;
    }
    const description = appointment.description || '';
    const nameMatch = description.match(/Client Name:\s*([^,]+)/);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    return appointment.title || 'Unknown Client';
  }

  getClientPhone(appointment: AppointmentDto): string {
    // First try to get phone from attendees (appointment data)
    if (appointment.attendees && appointment.attendees.length > 0) {
      const phone = appointment.attendees[0].phone;
      if (phone && phone.trim() !== '') {
        return phone;
      }
    }
    
    // Fallback: try to extract phone from description
    const description = appointment.description || '';
    const phoneMatch = description.match(/Phone:\s*([^,]+)/);
    if (phoneMatch) {
      return phoneMatch[1].trim();
    }
    
    // Additional fallback: try to get phone from client data
    const clientName = this.getClientName(appointment);
    
    // Find matching client by name or email
    const matchingClient = this.clients.find(client => {
      const attendeeEmail = appointment.attendees?.[0]?.email;
      return client.name.toLowerCase().includes(clientName.toLowerCase()) || 
             (attendeeEmail && client.email.toLowerCase() === attendeeEmail.toLowerCase());
    });
    
    if (matchingClient && matchingClient.phone) {
      return matchingClient.phone;
    }
    
    return 'N/A';
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

  // Cancel appointment
  cancelAppointment(appointmentId: string): void {
    this.cancelingAppointmentId = appointmentId;
    
    this.appointmentService.deleteAppointment(appointmentId).subscribe({
      next: (response) => {
        console.log('Appointment canceled:', response);
        this.loadAppointments(); // Reload the list
        this.cancelingAppointmentId = null;
      },
      error: (err) => {
        console.error('Error canceling appointment:', err);
        this.cancelingAppointmentId = null;
        alert('Failed to cancel appointment. Please try again.');
      }
    });
  }

  // Start reschedule process
  startReschedule(appointment: AppointmentDto): void {
    this.rescheduleAppointmentId = appointment._id || null;
    this.showRescheduleForm = true;
    
    // Pre-populate form with current date/time
    const currentDate = new Date(appointment.date);
    const dateStr = currentDate.toISOString().split('T')[0];
    const timeStr = currentDate.toTimeString().split(' ')[0].substring(0, 5);
    
    this.rescheduleForm.patchValue({
      date: dateStr,
      time: timeStr
    });
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
        this.loadAppointments(); // Reload the list
        this.cancelReschedule();
        this.reschedulingAppointmentId = null;
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
  getAvailableTimeSlotsForDate(selectedDate: string): string[] {
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

  // Check if a specific date/time combination is available
  isTimeSlotAvailable(date: string, time: string): boolean {
    if (!date || !time) return true;

    const selectedDateTime = new Date(`${date}T${time}:00`);
    
    // Check if any appointment exists at this exact time
    return !this.appointments.some(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.getTime() === selectedDateTime.getTime();
    });
  }

  // Check if appointment is being canceled
  isCanceling(appointmentId: string): boolean {
    return this.cancelingAppointmentId === appointmentId;
  }

  // Check if appointment is being rescheduled
  isRescheduling(appointmentId: string): boolean {
    return this.reschedulingAppointmentId === appointmentId;
  }

  // Get current date string for min date validation
  getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
}