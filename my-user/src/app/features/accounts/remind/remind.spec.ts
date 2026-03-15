import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Remind } from './remind';

describe('Remind', () => {
  let component: Remind;
  let fixture: ComponentFixture<Remind>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Remind]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Remind);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
