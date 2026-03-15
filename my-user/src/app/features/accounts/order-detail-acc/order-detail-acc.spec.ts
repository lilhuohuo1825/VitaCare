import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderDetailAcc } from './order-detail-acc';

describe('OrderDetailAcc', () => {
  let component: OrderDetailAcc;
  let fixture: ComponentFixture<OrderDetailAcc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetailAcc]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderDetailAcc);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
