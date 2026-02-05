import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Customermanage } from './customermanage';

describe('Customermanage', () => {
  let component: Customermanage;
  let fixture: ComponentFixture<Customermanage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Customermanage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Customermanage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
