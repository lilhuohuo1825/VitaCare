import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Productmanage } from './productmanage';

describe('Productmanage', () => {
  let component: Productmanage;
  let fixture: ComponentFixture<Productmanage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Productmanage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Productmanage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
