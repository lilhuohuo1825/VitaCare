import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Promotionmanage } from './promotionmanage';

describe('Promotionmanage', () => {
  let component: Promotionmanage;
  let fixture: ComponentFixture<Promotionmanage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Promotionmanage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Promotionmanage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
