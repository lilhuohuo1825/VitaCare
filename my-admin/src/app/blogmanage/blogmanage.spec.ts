import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Blogmanage } from './blogmanage';

describe('Blogmanage', () => {
  let component: Blogmanage;
  let fixture: ComponentFixture<Blogmanage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Blogmanage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Blogmanage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
