import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  host: {
    'ngSkipHydration': 'true'
  }
})
export class NavbarComponent implements OnInit {
  private readonly authService = inject(AuthService);

  // Reactive properties from AuthService
  isAuthenticated = this.authService.isAuthenticated;
  isAdmin = this.authService.isAdmin;
  currentUser = this.authService.currentUser;

  constructor() {
    // Navbar component initialized
  }

  ngOnInit(): void {
    // Navbar component initialized
  }

  // Mobile menu state
  mobileMenuOpen = false;
  
  // Admin dropdown state
  adminDropdownOpen = false;

  navItems = [
    { path: '/', label: 'Home' },
    { path: '/services', label: 'Book Appointment' },
    { path: '/view-appointments-user', label: 'My Appointments', showWhenLoggedIn: true },
    { path: '/account-details', label: 'Account Details', showWhenLoggedIn: true },
    { path: '/admin', label: 'Admin Privileges', adminOnly: true },
    { path: '/login', label: 'Login', showWhenLoggedOut: true },
    { path: '/register', label: 'Register', showWhenLoggedOut: true }
  ];

  adminItems = [
    { path: '/view', label: 'Admin View', icon: '📊' },
    { path: '/clients', label: 'Client Management', icon: '👥' },
    { path: '/calendar', label: 'Calendar View', icon: '📅' }
  ];

  logout(): void {
    this.authService.logout();
    this.closeMobileMenu();
    this.closeAdminDropdown();
  }

  onNavItemClick(item: any): void {
    console.log('Nav item clicked:', item);
    console.log('Navigating to:', item.path);
    this.closeMobileMenu();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  toggleAdminDropdown(): void {
    this.adminDropdownOpen = !this.adminDropdownOpen;
  }

  closeAdminDropdown(): void {
    this.adminDropdownOpen = false;
  }

  onAdminItemClick(): void {
    this.closeAdminDropdown();
    this.closeMobileMenu();
  }
}
