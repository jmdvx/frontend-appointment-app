import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(): boolean {
    // Check if user is authenticated and has admin role
    if (this.authService.isAuthenticated() && this.authService.isAdmin()) {
      console.log('✅ Admin access granted');
      return true;
    }
    
    console.log('❌ Admin access denied - redirecting to login');
    console.log('Auth status:', {
      isAuthenticated: this.authService.isAuthenticated(),
      isAdmin: this.authService.isAdmin(),
      currentUser: this.authService.currentUser()
    });
    
    // Redirect to login if not admin
    this.router.navigate(['/login']);
    return false;
  }
}
