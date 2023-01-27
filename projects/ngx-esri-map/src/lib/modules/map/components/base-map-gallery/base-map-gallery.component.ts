import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import { Subscription } from 'rxjs';
import { MapViewComponent } from '../map-view/map-view.component';
@Component({
  selector: 'lib-base-map-gallery',
  templateUrl: './base-map-gallery.component.html',
  styleUrls: ['./base-map-gallery.component.scss']
})
export class BaseMapGalleryComponent implements OnInit, OnDestroy, AfterViewInit {
  sub: Subscription;

  @ViewChild("basemapWidget") basemapWidget: ElementRef;
  constructor(private host: MapViewComponent) { }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  ngOnInit(): void {

  }
  ngAfterViewInit(): void {
    this.sub = this.host.initMap$.pipe().subscribe({
      next: initModel => {
        let view = initModel.mapView;
        const basemapGallery = new BasemapGallery({
          view: view,
          container: this.basemapWidget.nativeElement
        });

        basemapGallery.render();
      }
    });
  }

}
