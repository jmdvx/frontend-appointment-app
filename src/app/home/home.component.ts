import { Component, OnInit, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, AfterViewInit {
  
  // Signup form properties
  signupEmail: string = '';
  signupName: string = '';
  isSubmittingSignup: boolean = false;
  signupMessage: string = '';
  signupSuccess: boolean = false;

  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit() {
    // Component initialized
  }

  ngAfterViewInit() {
    // Only run animations in browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.initBackgroundAnimations();
    }
  }

  initBackgroundAnimations() {
    // Double-check we're in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Add mouse movement effects to floating shapes
    const heroBanner = document.querySelector('.hero-banner');
    if (heroBanner) {
      heroBanner.addEventListener('mousemove', (e) => {
        const mouseEvent = e as MouseEvent;
        const shapes = document.querySelectorAll('.floating-shape');
        const mouseX = mouseEvent.clientX / window.innerWidth;
        const mouseY = mouseEvent.clientY / window.innerHeight;
        
        shapes.forEach((shape, index) => {
          const speed = (index + 1) * 0.5;
          const x = (mouseX - 0.5) * speed * 20;
          const y = (mouseY - 0.5) * speed * 20;
          
          (shape as HTMLElement).style.transform = `translate(${x}px, ${y}px)`;
        });
      });

      // Reset shapes position when mouse leaves
      heroBanner.addEventListener('mouseleave', () => {
        const shapes = document.querySelectorAll('.floating-shape');
        shapes.forEach((shape) => {
          (shape as HTMLElement).style.transform = '';
        });
      });
    }

    // Add random particle generation
    this.generateRandomParticles();
  }

  generateRandomParticles() {
    // Double-check we're in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const heroBanner = document.querySelector('.hero-banner');
    if (!heroBanner) return;

    setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every interval
        const particle = document.createElement('div');
        particle.className = 'random-particle';
        particle.style.cssText = `
          position: absolute;
          width: 3px;
          height: 3px;
          background: rgba(236, 72, 153, 0.8);
          border-radius: 50%;
          left: ${Math.random() * 100}%;
          top: 100%;
          animation: randomParticleFloat 4s linear forwards;
          pointer-events: none;
          z-index: 1;
        `;
        
        heroBanner.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        }, 4000);
      }
    }, 2000);
  }
  
  scrollToServices() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const servicesSection = document.getElementById('services');
    if (servicesSection) {
      servicesSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // Signup form methods
  onSignupSubmit() {
    if (!this.signupEmail || !this.isValidEmail(this.signupEmail)) {
      this.signupMessage = 'Please enter a valid email address';
      this.signupSuccess = false;
      return;
    }

    this.isSubmittingSignup = true;
    this.signupMessage = '';

    // Simulate API call
    setTimeout(() => {
      this.isSubmittingSignup = false;
      this.signupSuccess = true;
      this.signupMessage = `Thank you ${this.signupName || 'for subscribing'}! You'll receive our latest updates soon.`;
      
      // Reset form
      this.signupEmail = '';
      this.signupName = '';
      
      // Clear message after 5 seconds
      setTimeout(() => {
        this.signupMessage = '';
      }, 5000);
    }, 1500);
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}


