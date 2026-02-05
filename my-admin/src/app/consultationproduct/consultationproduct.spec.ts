import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Consultationproduct } from './consultationproduct';

describe('Consultationproduct', () => {
  let component: Consultationproduct;
  let fixture: ComponentFixture<Consultationproduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Consultationproduct]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Consultationproduct);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
