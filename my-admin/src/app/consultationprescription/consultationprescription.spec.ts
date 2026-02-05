import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Consultationprescription } from './consultationprescription';

describe('Consultationprescription', () => {
  let component: Consultationprescription;
  let fixture: ComponentFixture<Consultationprescription>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Consultationprescription]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Consultationprescription);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
