import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ClientService, Client } from '../client.service';
import { AppointmentService } from '../appointment.service';

@Component({
  selector: 'app-client-management',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, ReactiveFormsModule, FormsModule],
  templateUrl: './client-management.component.html',
  styleUrl: './client-management.component.css'
})
export class ClientManagementComponent implements OnInit {
  private readonly clientService = inject(ClientService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly fb = inject(FormBuilder);

  clients: Client[] = [];
  filteredClients: Client[] = [];
  loading = true;
  errorMessage: string | null = null;
  
  // All appointments for client statistics
  allAppointments: any[] = [];
  
  // Search and filtering
  searchQuery: string = '';
  statusFilter: 'all' | 'active' | 'banned' = 'all';
  appointmentCountFilter: 'all' | '0' | '1-5' | '6-10' | '10+' = 'all';
  dateJoinedFilter: 'all' | 'today' | 'week' | 'month' | 'year' = 'all';
  roleFilter: 'all' | 'admin' = 'all';
  sortBy: 'name' | 'dateJoined' | 'lastAppointment' | 'appointmentCount' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  
  // Client form
  clientForm: FormGroup;
  showClientForm = false;
  editingClient: Client | null = null;
  
  // Client details modal
  selectedClient: Client | null = null;
  showClientDetails = false;
  clientAppointments: any[] = [];
  loadingClientDetails = false;
  
  // Edit mode state
  showEditForm = false;

  constructor() {
    this.clientForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      notes: [''],
      preferences: this.fb.group({
        favoriteServices: [[]],
        preferredTimes: [[]],
        allergies: [''],
        specialRequests: ['']
      })
    });
  }

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.loading = true;
    this.errorMessage = null;
    
    // Load both clients and appointments
    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.clients = clients;
        this.filteredClients = [...clients]; // Initialize filtered clients
        this.applyFilters(); // Apply current filters
        this.loadAppointments();
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error loading clients:', err);
        console.error('Error details:', err);
        
        // Use mock data for testing when backend is not available
        this.clients = this.getMockClients();
        this.filteredClients = [...this.clients];
        this.loading = false;
        
        // Extract meaningful error message
        let errorMsg = 'Failed to load clients - using mock data for testing';
        
        if (err.message) {
          errorMsg = err.message + ' - using mock data for testing';
        } else if (err.error?.message) {
          errorMsg = err.error.message + ' - using mock data for testing';
        } else if (err.status === 0) {
          errorMsg = 'Unable to connect to the server - using mock data for testing';
        } else if (err.status === 404) {
          errorMsg = 'Client API endpoint not found - using mock data for testing';
        } else if (err.status >= 500) {
          errorMsg = 'Server error occurred - using mock data for testing';
        }
        
        this.errorMessage = errorMsg;
      }
    });
  }

  // Mock data for testing when backend is not available
  private getMockClients(): Client[] {
    return [
      {
        _id: '1',
        name: 'James Admin',
        email: 'james@example.com',
        phone: '0831234567',
        dateJoined: new Date('2025-10-20'),
        lastUpdated: new Date('2025-10-21'),
        roles: ['admin'],
        preferences: {
          favoriteServices: ['manicure', 'pedicure'],
          preferredTimes: ['morning'],
          allergies: ['none'],
          specialRequests: 'manager'
        },
        notes: 'VIP client with admin privileges'
      },
      {
        _id: '2',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '0839876543',
        dateJoined: new Date('2025-10-22'),
        lastUpdated: new Date('2025-10-22'),
        roles: ['user'],
        preferences: {
          favoriteServices: ['facial'],
          preferredTimes: ['afternoon'],
          allergies: ['shellfish'],
          specialRequests: 'user'
        },
        notes: 'Regular client'
      },
      {
        _id: '3',
        name: 'Mike Wilson',
        email: 'mike@example.com',
        phone: '0835555555',
        dateJoined: new Date('2025-10-20'),
        lastUpdated: new Date('2025-10-23'),
        roles: ['user'],
        preferences: {
          favoriteServices: ['massage'],
          preferredTimes: ['evening'],
          allergies: ['none'],
          specialRequests: 'prefers deep tissue'
        },
        notes: 'Prefers evening appointments'
      }
    ];
  }

  loadAppointments(): void {
    this.appointmentService.getAppointments().subscribe({
      next: (appointments) => {
        console.log('📅 Loaded appointments:', appointments);
        this.allAppointments = appointments;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
        // Use mock appointments for testing when backend is not available
        console.log('🔄 Using mock appointments for testing...');
        this.allAppointments = this.getMockAppointments();
        this.loading = false;
      }
    });
  }

  // Mock appointments for testing when backend is not available
  private getMockAppointments(): any[] {
    return [
      {
        _id: 'app1',
        date: '2025-10-21',
        time: '10:00',
        service: 'manicure',
        attendees: [
          { name: 'James Admin', email: 'james@example.com', phone: '0831234567', rsvp: 'confirmed' }
        ]
      },
      {
        _id: 'app2',
        date: '2025-10-23',
        time: '14:00',
        service: 'pedicure',
        attendees: [
          { name: 'James Admin', email: 'james@example.com', phone: '0831234567', rsvp: 'confirmed' }
        ]
      },
      {
        _id: 'app3',
        date: '2025-10-25',
        time: '16:00',
        service: 'facial',
        attendees: [
          { name: 'Sarah Johnson', email: 'sarah@example.com', phone: '0839876543', rsvp: 'confirmed' }
        ]
      }
    ];
  }


  // Edit existing client - now shows details first
  editClient(client: Client): void {
    this.selectedClient = client;
    this.showClientDetails = true;
    this.showEditForm = false;
    this.clientAppointments = this.getClientAppointments(client);
  }
  
  // Start editing from details view
  startEditClient(): void {
    if (this.selectedClient) {
      this.editingClient = this.selectedClient;
      this.clientForm.patchValue({
        name: this.selectedClient.name,
        email: this.selectedClient.email,
        phone: this.selectedClient.phone,
        notes: this.selectedClient.notes || '',
        preferences: {
          favoriteServices: this.selectedClient.preferences?.favoriteServices || [],
          preferredTimes: this.selectedClient.preferences?.preferredTimes || [],
          allergies: this.selectedClient.preferences?.allergies || '',
          specialRequests: this.selectedClient.preferences?.specialRequests || ''
        }
      });
      this.showEditForm = true;
      this.showClientDetails = false;
    }
  }
  
  // Cancel editing and return to details view
  cancelEdit(): void {
    this.showEditForm = false;
    this.showClientDetails = true;
    this.editingClient = null;
    this.clientForm.reset();
  }

  // View client details
  viewClientDetails(client: Client): void {
    this.selectedClient = client;
    this.loadingClientDetails = true;
    this.showClientDetails = true;
    
    // Use the helper method to get client appointments
    this.clientAppointments = this.getClientAppointments(client);
    this.loadingClientDetails = false;
  }

  // Combined view/edit client method
  viewOrEditClient(client: Client): void {
    this.selectedClient = client;
    this.loadingClientDetails = true;
    this.showClientDetails = true;
    
    // Use the helper method to get client appointments
    this.clientAppointments = this.getClientAppointments(client);
    this.loadingClientDetails = false;
  }

  // Submit client form
  submitClient(): void {
    if (!this.clientForm.valid) {
      return;
    }

    const clientData = this.clientForm.value;
    
    if (this.editingClient) {
      // Update existing client
      this.clientService.updateClient(this.editingClient._id!, clientData).subscribe({
        next: (response) => {
          console.log('Client updated:', response);
          this.loadClients();
          if (this.showEditForm) {
            // If editing from details view, return to details view
            this.showEditForm = false;
            this.showClientDetails = true;
            this.editingClient = null;
            this.clientForm.reset();
            // Update selectedClient with new data
            if (this.selectedClient) {
              this.selectedClient = { ...this.selectedClient, ...clientData };
              this.clientAppointments = this.getClientAppointments(this.selectedClient!);
            }
          } else {
            // If editing from main form, close form
            this.closeClientForm();
          }
        },
        error: (err) => {
          console.error('Error updating client:', err);
          alert('Failed to update client. Please try again.');
        }
      });
    } else {
      // Create new client - REMOVED: Users must register through registration page
      alert('New clients must register through the registration page. Please direct them to create an account.');
    }
  }

  // Close client form
  closeClientForm(): void {
    this.showClientForm = false;
    this.editingClient = null;
    this.clientForm.reset();
  }

  // Close client details
  closeClientDetails(): void {
    this.showClientDetails = false;
    this.selectedClient = null;
    this.clientAppointments = [];
  }

  // Delete client
  deleteClient(client: Client): void {
    this.clientService.deleteClient(client._id!).subscribe({
      next: (response) => {
        console.log('Client deleted:', response);
        this.loadClients();
      },
      error: (err) => {
        console.error('Error deleting client:', err);
        alert('Failed to delete client. Please try again.');
      }
    });
  }

  // Ban/Unban client
  banClient(client: Client & { isBanned?: boolean }): void {
    const action = client.isBanned ? 'unban' : 'ban';
    const actionText = client.isBanned ? 'unban' : 'ban';
    
    // For now, we'll toggle the ban status locally
    // In a real implementation, you'd call a backend API
    client.isBanned = !client.isBanned;
    
    console.log(`Client ${actionText}ned:`, client);
    
    // Show success message
    const message = client.isBanned 
      ? `${client.name} has been banned from booking appointments.`
      : `${client.name} has been unbanned and can book appointments again.`;
    
    alert(message);
    
    // In a real implementation, you would call:
    // this.clientService.updateClient(client._id!, { isBanned: client.isBanned }).subscribe({...});
  }

  // Format date
  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Get client's total appointments
  getClientTotalAppointments(client: Client): number {
    return this.getClientAppointments(client).length;
  }

  // Get client's last appointment
  getClientLastAppointment(client: Client): string {
    const clientAppointments = this.getClientAppointments(client);
    
    if (clientAppointments.length === 0) {
      return 'No appointments';
    }
    
    const lastAppointment = clientAppointments
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    return this.formatDate(lastAppointment.date);
  }

  // Get appointments for a specific client
  getClientAppointments(client: Client): any[] {
    // Filter appointments by userId (same approach as user appointments)
    const clientAppointments = this.allAppointments.filter(apt => {
      return apt.userId === client._id;
    });
    
    return clientAppointments;
  }

  // Get service options for preferences
  getServiceOptions(): string[] {
    return ['Full Set', 'Refills', 'Manicure', 'Pedicure', 'Gel Polish', 'Nail Art'];
  }

  // Get time options for preferences
  getTimeOptions(): string[] {
    const times = [];
    for (let hour = 9; hour <= 18; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return times;
  }

  // Toggle service preference
  toggleServicePreference(service: string, event: any): void {
    const currentServices = this.clientForm.get('preferences.favoriteServices')?.value || [];
    if (event.target.checked) {
      this.clientForm.get('preferences.favoriteServices')?.setValue([...currentServices, service]);
    } else {
      this.clientForm.get('preferences.favoriteServices')?.setValue(currentServices.filter((s: string) => s !== service));
    }
  }

  // Check if service is selected
  isServiceSelected(service: string): boolean {
    const currentServices = this.clientForm.get('preferences.favoriteServices')?.value || [];
    return currentServices.includes(service);
  }

  // Toggle time preference
  toggleTimePreference(time: string, event: any): void {
    const currentTimes = this.clientForm.get('preferences.preferredTimes')?.value || [];
    if (event.target.checked) {
      this.clientForm.get('preferences.preferredTimes')?.setValue([...currentTimes, time]);
    } else {
      this.clientForm.get('preferences.preferredTimes')?.setValue(currentTimes.filter((t: string) => t !== time));
    }
  }

  // Check if time is selected
  isTimeSelected(time: string): boolean {
    const currentTimes = this.clientForm.get('preferences.preferredTimes')?.value || [];
    return currentTimes.includes(time);
  }

  // Get active clients count
  getActiveClientsCount(): number {
    return this.clients.filter(c => this.getClientAppointments(c).length > 0).length;
  }

  // Search and filtering methods
  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.clients];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phone.includes(query)
      );
    }

    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(client => {
        if (this.statusFilter === 'active') {
          return !client.isBanned;
        } else if (this.statusFilter === 'banned') {
          return client.isBanned;
        }
        return true;
      });
    }

    // Apply appointment count filter
    if (this.appointmentCountFilter !== 'all') {
      filtered = filtered.filter(client => {
        const appointmentCount = this.getClientTotalAppointments(client);
        switch (this.appointmentCountFilter) {
          case '0':
            return appointmentCount === 0;
          case '1-5':
            return appointmentCount >= 1 && appointmentCount <= 5;
          case '6-10':
            return appointmentCount >= 6 && appointmentCount <= 10;
          case '10+':
            return appointmentCount > 10;
          default:
            return true;
        }
      });
    }

    // Apply date joined filter
    if (this.dateJoinedFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(client => {
        const joinedDate = new Date(client.dateJoined);
        switch (this.dateJoinedFilter) {
          case 'today':
            return joinedDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return joinedDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return joinedDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            return joinedDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    // Apply role filter
    if (this.roleFilter !== 'all') {
      filtered = filtered.filter(client => {
        return this.hasRole(client, this.roleFilter);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortBy) {
        case 'name':
          const aName = a.name || '';
          const bName = b.name || '';
          comparison = aName.localeCompare(bName);
          break;
        case 'dateJoined':
          const aDate = a.dateJoined ? new Date(a.dateJoined).getTime() : 0;
          const bDate = b.dateJoined ? new Date(b.dateJoined).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'lastAppointment':
          const aLastAppointment = this.getClientLastAppointmentDate(a);
          const bLastAppointment = this.getClientLastAppointmentDate(b);
          comparison = aLastAppointment.getTime() - bLastAppointment.getTime();
          break;
        case 'appointmentCount':
          comparison = this.getClientTotalAppointments(a) - this.getClientTotalAppointments(b);
          break;
      }
      
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

    this.filteredClients = filtered;
  }

  // Helper method to get last appointment date for sorting
  private getClientLastAppointmentDate(client: Client): Date {
    const clientAppointments = this.getClientAppointments(client);
    if (clientAppointments.length === 0) {
      return new Date(0); // Very old date for clients with no appointments
    }
    
    const sortedAppointments = clientAppointments.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return new Date(sortedAppointments[0].date);
  }

  // Clear all filters
  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.appointmentCountFilter = 'all';
    this.dateJoinedFilter = 'all';
    this.roleFilter = 'all';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.applyFilters();
  }

  // Get filtered clients count for display
  getFilteredClientsCount(): number {
    return this.filteredClients.length;
  }

  // Role management methods
  getAvailableRoles(): string[] {
    return ['admin'];
  }

  hasRole(client: Client, role: string): boolean {
    return client.roles?.includes(role) || false;
  }

  grantRole(client: Client, role: string): void {
    if (!client.roles) {
      client.roles = [];
    }
    
    if (!client.roles.includes(role)) {
      client.roles.push(role);
      this.updateClientRoles(client);
    }
  }

  removeRole(client: Client, role: string): void {
    if (client.roles) {
      const index = client.roles.indexOf(role);
      if (index > -1) {
        client.roles.splice(index, 1);
        this.updateClientRoles(client);
      }
    }
  }

  toggleRole(client: Client, role: string): void {
    if (this.hasRole(client, role)) {
      this.removeRole(client, role);
    } else {
      this.grantRole(client, role);
    }
  }

  private updateClientRoles(client: Client): void {
    if (!client._id) return;

    this.clientService.updateClient(client._id, { roles: client.roles }).subscribe({
      next: (response) => {
        console.log('Client roles updated:', response);
        // Update the client in our local array
        const index = this.clients.findIndex(c => c._id === client._id);
        if (index > -1) {
          this.clients[index] = { ...this.clients[index], roles: client.roles };
        }
        // Update selected client if it's the same
        if (this.selectedClient && this.selectedClient._id === client._id) {
          this.selectedClient.roles = client.roles;
        }
        // Update editing client if it's the same
        if (this.editingClient && this.editingClient._id === client._id) {
          this.editingClient.roles = client.roles;
        }
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error updating client roles:', err);
        alert('Failed to update client roles. Please try again.');
        // Revert the change
        this.loadClients();
      }
    });
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'admin': 'Administrator'
    };
    return roleNames[role] || role;
  }

  getRoleBadgeClass(role: string): string {
    const roleClasses: { [key: string]: string } = {
      'admin': 'role-badge-admin'
    };
    return roleClasses[role] || 'role-badge-default';
  }
}
