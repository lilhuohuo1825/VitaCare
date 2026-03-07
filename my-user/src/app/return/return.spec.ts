import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Return } from './return';

describe('Return', () => {
  let component: Return;
  let fixture: ComponentFixture<Return>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Return]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Return);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
