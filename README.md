# Katie's Nail Post - Appointment Booking Frontend

A modern, responsive Angular application for booking nail appointments with comprehensive validation and error handling.

## 🌟 Features

### ✨ Core Functionality
- **User Authentication**: Login, registration, password reset
- **Service Selection**: Choose from various nail services
- **Appointment Booking**: Book appointments with date/time selection
- **Calendar Management**: View and manage appointments
- **Admin Dashboard**: Complete admin panel for managing appointments and clients
- **Client Management**: Manage client information and preferences

### 🛡️ Advanced Validation
- **Form Validation**: Comprehensive client-side validation
- **Error Handling**: Robust error handling for all scenarios
- **Network Error Recovery**: Graceful handling of network issues
- **Date/Time Validation**: Prevents booking conflicts and invalid dates
- **Real-time Feedback**: Instant validation feedback with visual indicators

### 📱 Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Tablet Support**: Responsive design for tablets
- **Desktop Experience**: Full-featured desktop interface
- **Cross-Browser**: Compatible with all modern browsers

### 🎨 Modern UI/UX
- **Pink Theme**: Consistent brand colors throughout
- **Gradient Backgrounds**: Beautiful gradient designs
- **Loading States**: Smooth loading animations
- **Error Messages**: Clear, helpful error messages with icons
- **Success Feedback**: Positive confirmation messages

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v8 or higher)
- Angular CLI (v17 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/frontend-appointment-app.git
   cd frontend-appointment-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure backend URL**
   Update the API endpoints in the service files to point to your backend:
   - `src/app/auth.service.ts`
   - `src/app/appointment.service.ts`
   - `src/app/blocked-dates.service.ts`
   - `src/app/client.service.ts`

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:4200`

## 🏗️ Project Structure

```
src/
├── app/
│   ├── account-details/          # User account management
│   ├── book-appointment/        # Appointment booking with validation
│   ├── calendar-view/           # Calendar management
│   ├── client-management/       # Admin client management
│   ├── home/                    # Landing page
│   ├── login/                   # User authentication
│   ├── navbar/                  # Navigation component
│   ├── register/                # User registration
│   ├── reset-password/          # Password reset
│   ├── services/                # Service selection
│   ├── user-appointments/       # User's appointments
│   ├── view-appointments/       # Admin appointment view
│   ├── auth.service.ts          # Authentication service
│   ├── appointment.service.ts   # Appointment management
│   ├── blocked-dates.service.ts # Blocked dates management
│   └── client.service.ts        # Client management
├── assets/                      # Static assets
└── styles.css                   # Global styles
```

## 🔧 Configuration

### Backend Integration
The frontend is configured to work with the backend API at:
- **Development**: `http://localhost:3000`
- **Production**: `https://backend-appointment-app-wqo0.onrender.com`

### Environment Variables
Create a `src/environments/environment.ts` file:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
  authUrl: 'http://localhost:3000/api/auth'
};
```

## 🎯 Key Components

### Book Appointment Component
- **Comprehensive Validation**: Form validation with real-time feedback
- **Error Handling**: Network errors, validation errors, business logic errors
- **Date/Time Selection**: Prevents conflicts and invalid selections
- **Service Integration**: Seamless service selection and booking

### Admin Dashboard
- **Appointment Management**: View, edit, delete appointments
- **Client Management**: Manage client information and preferences
- **Calendar View**: Visual calendar with appointment management
- **Blocked Dates**: Manage unavailable dates

### Authentication System
- **Secure Login**: Email/password authentication
- **Registration**: User registration with validation
- **Password Reset**: Secure password reset functionality
- **Session Management**: Automatic session handling

## 🛠️ Development

### Available Scripts
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run lint` - Run linting

### Code Quality
- **TypeScript**: Full TypeScript implementation
- **Angular Best Practices**: Following Angular style guide
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG compliant components

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Static Hosting
The built files in `dist/appointment-app/browser/` can be deployed to:
- **Netlify**: Drag and drop deployment
- **Vercel**: Git-based deployment
- **GitHub Pages**: Static site hosting
- **AWS S3**: Static website hosting

### Environment Configuration
For production deployment, update the API URLs in your environment files.

## 🔒 Security Features

- **Input Validation**: Client-side validation for all forms
- **XSS Protection**: Angular's built-in XSS protection
- **CSRF Protection**: CSRF tokens for API requests
- **Secure Authentication**: JWT-based authentication
- **Error Handling**: No sensitive information in error messages

## 📱 Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- **Email**: support@katiesnailpost.com
- **Issues**: GitHub Issues
- **Documentation**: This README

## 🎉 Acknowledgments

- **Angular Team**: For the amazing framework
- **Bootstrap**: For responsive design utilities
- **Font Awesome**: For beautiful icons
- **Community**: For inspiration and support

---

**Built with ❤️ for Katie's Nail Post**