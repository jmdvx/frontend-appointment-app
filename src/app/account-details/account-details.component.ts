import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

interface UserDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

@Component({
  selector: 'app-account-details',
  imports: [CommonModule, FormsModule],
  templateUrl: './account-details.component.html',
  styleUrl: './account-details.component.css'
})
export class AccountDetailsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  
  userDetails: UserDetails = {
    id: '',
    name: '',
    email: '',
    phone: '',
    role: '',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  originalDetails: UserDetails = { ...this.userDetails };
  isAdmin = false;
  
  // Enhanced UX properties
  isSubmitting = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  isAnimating = false;
  fieldErrors: { [key: string]: string } = {};

  // Password change properties
  passwordData: PasswordData = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };
  isChangingPassword = false;

  // Account deletion properties
  showDeleteConfirmation = false;
  deleteConfirmation = '';
  isDeleting = false;

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    this.loadUserDetails();
  }

  loadUserDetails() {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.userDetails = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone || '',
        role: currentUser.role,
        createdAt: new Date('2024-01-01'), // Mock date
        updatedAt: new Date()
      };
      this.originalDetails = { ...this.userDetails };
    }
  }

  onSubmit() {
    if (this.isAnimating || this.isSubmitting) return;
    
    this.clearMessages();
    this.validateForm();
    
    if (this.isFormValid()) {
      this.isSubmitting = true;
      this.isAnimating = true;
      
      // Simulate API call with animation
      setTimeout(() => {
        try {
          // Here you would typically call an API to update the user details
          console.log('Updating user details:', this.userDetails);
          
          // For now, just update the local auth service
          const currentUser = this.authService.currentUser();
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              name: this.userDetails.name,
              email: this.userDetails.email,
              phone: this.userDetails.phone
            };
            
            this.authService.updateUser(updatedUser);
            this.originalDetails = { ...this.userDetails };
            
            this.showSuccessMessage('Account details updated successfully! ✨');
          }
        } catch (error) {
          this.showErrorMessage('Failed to update account details. Please try again.');
        } finally {
          this.isSubmitting = false;
          this.isAnimating = false;
        }
      }, 1000);
    } else {
      this.showErrorMessage('Please fix the errors below before submitting.');
    }
  }

  resetForm() {
    this.userDetails = { ...this.originalDetails };
  }

  isFormValid(): boolean {
    return !!(this.userDetails.name && this.userDetails.email && this.userDetails.phone);
  }

  hasChanges(): boolean {
    return JSON.stringify(this.userDetails) !== JSON.stringify(this.originalDetails);
  }

  // Enhanced UX methods
  validateForm(): void {
    this.fieldErrors = {};
    
    if (!this.userDetails.name || this.userDetails.name.trim().length < 2) {
      this.fieldErrors['name'] = 'Name must be at least 2 characters long';
    }
    
    if (!this.userDetails.email || !this.isValidEmail(this.userDetails.email)) {
      this.fieldErrors['email'] = 'Please enter a valid email address';
    }
    
    if (!this.userDetails.phone || !this.isValidPhone(this.userDetails.phone)) {
      this.fieldErrors['phone'] = 'Please enter a valid phone number (e.g., 0833866364)';
    }
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone: string): boolean {
    // Allow Irish mobile numbers starting with 08 followed by 8 digits
    // Format: 08XXXXXXXX (e.g., 0833866364)
    const phoneRegex = /^08[0-9]\d{7}$/;
    return phoneRegex.test(phone);
  }

  getFieldError(fieldName: string): string | null {
    return this.fieldErrors[fieldName] || null;
  }

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

  clearMessages(): void {
    this.successMessage = null;
    this.errorMessage = null;
    this.fieldErrors = {};
  }

  onFieldChange(fieldName: string): void {
    // Clear field-specific error when user starts typing
    if (this.fieldErrors[fieldName]) {
      delete this.fieldErrors[fieldName];
    }
  }

  // Format phone number as user types - only allow numbers
  formatPhoneNumber(value: string): string {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits maximum
    return digits.slice(0, 10);
  }

  onPhoneInput(event: any): void {
    const formatted = this.formatPhoneNumber(event.target.value);
    this.userDetails.phone = formatted;
    this.onFieldChange('phone');
  }

  // Password change methods
  changePassword(): void {
    if (!this.isPasswordFormValid()) return;

    this.isChangingPassword = true;
    this.clearMessages();

    // Simulate password change API call
    setTimeout(() => {
      try {
        console.log('Changing password for user:', this.userDetails.id);
        
        // Here you would typically call an API to change the password
        // For now, just simulate success
        this.showSuccessMessage('Password changed successfully! 🔐');
        this.resetPasswordForm();
      } catch (error) {
        this.showErrorMessage('Failed to change password. Please try again.');
      } finally {
        this.isChangingPassword = false;
      }
    }, 1500);
  }

  isPasswordFormValid(): boolean {
    return !!(
      this.passwordData.currentPassword &&
      this.passwordData.newPassword &&
      this.passwordData.confirmNewPassword &&
      this.passwordData.newPassword === this.passwordData.confirmNewPassword &&
      this.passwordData.newPassword.length >= 6
    );
  }

  resetPasswordForm(): void {
    this.passwordData = {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    };
  }

  // Account deletion methods
  deleteAccount(): void {
    if (this.deleteConfirmation !== 'DELETE') return;

    this.isDeleting = true;
    this.clearMessages();

    // Simulate account deletion API call
    setTimeout(() => {
      try {
        console.log('Deleting account for user:', this.userDetails.id);
        
        // Here you would typically call an API to delete the account
        // For now, just simulate success and logout
        this.showSuccessMessage('Account deleted successfully. You will be logged out.');
        
        setTimeout(() => {
          this.authService.logout();
        }, 2000);
      } catch (error) {
        this.showErrorMessage('Failed to delete account. Please try again.');
      } finally {
        this.isDeleting = false;
        this.showDeleteConfirmation = false;
        this.deleteConfirmation = '';
      }
    }, 2000);
  }
}
