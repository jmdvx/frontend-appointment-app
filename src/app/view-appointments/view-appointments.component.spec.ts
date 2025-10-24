import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ViewAppointmentsComponent } from './view-appointments.component';

describe('ViewAppointmentsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewAppointmentsComponent],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ViewAppointmentsComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
