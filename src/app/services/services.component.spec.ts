import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ServicesComponent } from './services.component';

describe('ServicesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesComponent, RouterTestingModule]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ServicesComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should have nail services', () => {
    const fixture = TestBed.createComponent(ServicesComponent);
    const component = fixture.componentInstance;
    expect(component.services.length).toBe(2);
    expect(component.services[0].name).toBe('Full Set');
    expect(component.services[1].name).toBe('Refill');
  });
});
