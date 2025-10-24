import { Component, OnInit, inject, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

export interface NailService {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css'
})
export class ServicesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}
  
  services: NailService[] = [
    {
      id: 'full-set',
      name: 'Full Set',
      description: 'Complete nail enhancement with tips and gel polish. Includes nail shaping, cuticle care, and beautiful gel polish application.',
      duration: 90,
      price: 45
    },
    {
      id: 'refill',
      name: 'Refill',
      description: 'Fill in grown nails and fresh gel polish. Perfect for maintaining your beautiful nails between full sets.',
      duration: 60,
      price: 35
    },
    {
      id: 'manicure',
      name: 'Classic Manicure',
      description: 'Traditional manicure with nail shaping, cuticle care, and regular polish application.',
      duration: 45,
      price: 25
    },
    {
      id: 'pedicure',
      name: 'Luxury Pedicure',
      description: 'Relaxing pedicure with foot soak, exfoliation, nail shaping, and gel polish application.',
      duration: 75,
      price: 40
    },
    {
      id: 'nail-art',
      name: 'Nail Art Design',
      description: 'Creative nail art designs including hand-painted details, glitter, and decorative elements.',
      duration: 30,
      price: 15
    },
    {
      id: 'gel-polish',
      name: 'Gel Polish Only',
      description: 'Quick gel polish application on natural nails. Perfect for a long-lasting manicure.',
      duration: 30,
      price: 20
    }
  ];

  // Admin functionality
  isAdmin = false;
  showServiceForm = false;
  editingService: NailService | null = null;
  serviceForm!: FormGroup;

  // Authentication status
  isLoggedIn = false;
  currentUserRole: string = '';
  message: string | null = null;

  // Animation and interaction states
  selectedService: NailService | null = null;
  isAnimating = false;
  hoveredCard: string | null = null;

  ngOnInit(): void {
    console.log('Services component initialized');
    console.log('Current auth state:', this.authService.isAuthenticated());
    console.log('Current user:', this.authService.currentUser());
    console.log('Is admin?', this.authService.isAdmin());
    
    this.loadServices();
    this.checkAdminStatus();
    this.checkAuthStatus();
    this.initializeServiceForm();
  }

  checkAdminStatus(): void {
    this.isAdmin = this.authService.isAdmin();
    console.log('Admin status checked:', this.isAdmin);
    console.log('Current user role:', this.authService.currentUser()?.role);
  }

  checkAuthStatus(): void {
    this.isLoggedIn = this.authService.isAuthenticated();
    const currentUser = this.authService.currentUser();
    this.currentUserRole = currentUser?.role || '';
  }

  initializeServiceForm(): void {
    this.serviceForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      duration: ['', [Validators.required, Validators.min(15), Validators.max(300)]],
      price: ['', [Validators.required, Validators.min(1), Validators.max(1000)]]
    });
  }

  selectService(service: NailService) {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.selectedService = service;
    
    console.log('Service selected:', service);
    console.log('Current auth state:', this.authService.isAuthenticated());
    
    // Add visual feedback
    this.hoveredCard = service.id;
    
    // Check if user is logged in
    if (!this.authService.isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      this.message = 'Please log in to book an appointment. Redirecting to login page...';
      
      // Add animation delay before redirect
      setTimeout(() => {
        this.router.navigate(['/login']);
        this.isAnimating = false;
      }, 2000);
      return;
    }

    // Store selected service and navigate to booking with animation
    console.log('User authenticated, storing service and navigating to booking');
    localStorage.setItem('selectedService', JSON.stringify(service));
    
    // Add success message
    this.message = `Selected ${service.name}! Redirecting to booking...`;
    
    setTimeout(() => {
      this.router.navigate(['/book']);
      this.isAnimating = false;
      this.hoveredCard = null;
    }, 1500);
  }

  // Interactive methods
  onCardHover(serviceId: string): void {
    if (!this.isAnimating) {
      this.hoveredCard = serviceId;
    }
  }

  onCardLeave(): void {
    if (!this.isAnimating) {
      this.hoveredCard = null;
    }
  }

  clearMessage(): void {
    this.message = null;
  }

  // Debug method to check current user status
  debugUserStatus(): void {
    console.log('=== SERVICES COMPONENT DEBUG ===');
    console.log('isAdmin:', this.isAdmin);
    console.log('isLoggedIn:', this.isLoggedIn);
    console.log('AuthService.isAdmin():', this.authService.isAdmin());
    console.log('AuthService.isAuthenticated():', this.authService.isAuthenticated());
    console.log('Current user:', this.authService.currentUser());
    console.log('User role:', this.authService.currentUser()?.role);
    console.log('User email:', this.authService.currentUser()?.email);
    console.log('Current services:', this.services);
    
    // Check if localStorage is available using Angular's platform check
    if (isPlatformBrowser(this.platformId)) {
      console.log('Services in localStorage:', localStorage.getItem('nailServices'));
    } else {
      console.log('localStorage not available (SSR)');
    }
  }

  // Reset services to default (admin only)
  resetServicesToDefault(): void {
    if (!this.isAdmin) {
      alert('Only administrators can reset services.');
      return;
    }

    if (!confirm('Are you sure you want to reset all services to default? This will remove all custom services.')) {
      return;
    }

    // Reset to default services
    this.services = [
      {
        id: 'full-set',
        name: 'Full Set',
        description: 'Complete nail enhancement with tips and gel polish. Includes nail shaping, cuticle care, and beautiful gel polish application.',
        duration: 90,
        price: 45
      },
      {
        id: 'refill',
        name: 'Refill',
        description: 'Fill in grown nails and fresh gel polish. Perfect for maintaining your beautiful nails between full sets.',
        duration: 60,
        price: 35
      },
      {
        id: 'manicure',
        name: 'Classic Manicure',
        description: 'Traditional manicure with nail shaping, cuticle care, and regular polish application.',
        duration: 45,
        price: 25
      },
      {
        id: 'pedicure',
        name: 'Luxury Pedicure',
        description: 'Relaxing pedicure with foot soak, exfoliation, nail shaping, and gel polish application.',
        duration: 75,
        price: 40
      },
      {
        id: 'nail-art',
        name: 'Nail Art Design',
        description: 'Creative nail art designs including hand-painted details, glitter, and decorative elements.',
        duration: 30,
        price: 15
      },
      {
        id: 'gel-polish',
        name: 'Gel Polish Only',
        description: 'Quick gel polish application on natural nails. Perfect for a long-lasting manicure.',
        duration: 30,
        price: 20
      }
    ];

    this.saveServices();
    alert('Services have been reset to default.');
  }

  // Enhanced admin methods with animations
  addService(): void {
    this.editingService = null;
    this.serviceForm.reset();
    this.showServiceForm = true;
  }

  editService(service: NailService): void {
    this.editingService = service;
    this.serviceForm.patchValue({
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price
    });
    this.showServiceForm = true;
  }


  closeServiceForm(): void {
    this.showServiceForm = false;
    this.editingService = null;
    this.serviceForm.reset();
  }

  private generateServiceId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  // Service persistence methods
  private loadServices(): void {
    // Check if we're in browser environment using Angular's platform check
    if (isPlatformBrowser(this.platformId)) {
      const savedServices = localStorage.getItem('nailServices');
      if (savedServices) {
        try {
          this.services = JSON.parse(savedServices);
          console.log('Loaded services from localStorage:', this.services);
        } catch (error) {
          console.error('Error loading services from localStorage:', error);
          this.saveServices(); // Save default services if loading fails
        }
      } else {
        console.log('No saved services found, using default services');
        this.saveServices(); // Save default services to localStorage
      }
    } else {
      console.log('localStorage not available (SSR), using default services');
    }
  }

  private saveServices(): void {
    // Check if we're in browser environment using Angular's platform check
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem('nailServices', JSON.stringify(this.services));
        console.log('Services saved to localStorage:', this.services);
      } catch (error) {
        console.error('Error saving services to localStorage:', error);
      }
    } else {
      console.log('localStorage not available (SSR), cannot save services');
    }
  }

  // Enhanced save service method with persistence
  saveService(): void {
    if (this.serviceForm.valid) {
      const formValue = this.serviceForm.value;
      
      if (this.editingService) {
        // Update existing service
        const index = this.services.findIndex(s => s.id === this.editingService!.id);
        if (index !== -1) {
          this.services[index] = {
            ...this.editingService,
            name: formValue.name,
            description: formValue.description,
            duration: formValue.duration,
            price: formValue.price
          };
          this.saveServices(); // Persist changes
          alert(`Service "${formValue.name}" has been updated.`);
        }
      } else {
        // Add new service
        const newService: NailService = {
          id: this.generateServiceId(formValue.name),
          name: formValue.name,
          description: formValue.description,
          duration: formValue.duration,
          price: formValue.price
        };
        this.services.push(newService);
        this.saveServices(); // Persist changes
        alert(`Service "${formValue.name}" has been added.`);
      }
      
      this.closeServiceForm();
    } else {
      alert('Please fill in all fields correctly.');
    }
  }

  // Enhanced delete service method with persistence
  deleteService(service: NailService): void {
    if (!confirm(`Are you sure you want to delete "${service.name}"? This action cannot be undone.`)) {
      return;
    }

    this.services = this.services.filter(s => s.id !== service.id);
    this.saveServices(); // Persist changes
    alert(`Service "${service.name}" has been deleted.`);
  }
}
