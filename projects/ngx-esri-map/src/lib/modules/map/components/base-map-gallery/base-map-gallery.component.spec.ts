import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseMapGalleryComponent } from './base-map-gallery.component';

describe('BaseMapGalleryComponent', () => {
  let component: BaseMapGalleryComponent;
  let fixture: ComponentFixture<BaseMapGalleryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BaseMapGalleryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseMapGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
