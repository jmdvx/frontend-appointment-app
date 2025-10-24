import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { BookAppointmentComponent } from './book-appointment/book-appointment.component';
import { ViewAppointmentsComponent } from './view-appointments/view-appointments.component';
import { UserAppointmentsComponent } from './user-appointments/user-appointments.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { ServicesComponent } from './services/services.component';
import { ClientManagementComponent } from './client-management/client-management.component';
import { CalendarViewComponent } from './calendar-view/calendar-view.component';
import { AccountDetailsComponent } from './account-details/account-details.component';
import { AdminGuard } from './admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'services', component: ServicesComponent },
  { path: 'book', component: BookAppointmentComponent },
  { path: 'view', component: ViewAppointmentsComponent, canActivate: [AdminGuard] },
  { path: 'view-appointments-user', component: UserAppointmentsComponent },
  { path: 'clients', component: ClientManagementComponent, canActivate: [AdminGuard] },
  { path: 'calendar', component: CalendarViewComponent, canActivate: [AdminGuard] },
  { path: 'account-details', component: AccountDetailsComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
];
