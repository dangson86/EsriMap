import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MapTocUIComponent } from './map-toc-ui.component';

describe('MapTocUIComponent', () => {
  let component: MapTocUIComponent;
  let fixture: ComponentFixture<MapTocUIComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ MapTocUIComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapTocUIComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
