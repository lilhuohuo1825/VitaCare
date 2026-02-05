import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ordermanage } from './ordermanage';

describe('Ordermanage', () => {
  let component: Ordermanage;
  let fixture: ComponentFixture<Ordermanage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ordermanage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Ordermanage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
