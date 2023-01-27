import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import { Subscription } from 'rxjs';
import { MapViewComponent } from '../map-view/map-view.component';
@Component({
  selector: 'lib-base-map-gallery',
  templateUrl: './base-map-gallery.component.html',
  styleUrls: ['./base-map-gallery.component.scss']
})
export class BaseMapGalleryComponent implements OnInit, OnDestroy {
  sub: Subscription;

  private basemapGallery: BasemapGallery;
  constructor(private mapComp: MapViewComponent, private host: ElementRef) { }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
    if (this.basemapGallery) {
      this.basemapGallery.destroy();
    }
  }

  ngOnInit(): void {
    this.sub = this.mapComp.initMap$.pipe().subscribe({
      next: initModel => {
        let view = initModel.mapView;
        this.basemapGallery = new BasemapGallery({
          view: view,
          container: this.host.nativeElement
        });

        this.basemapGallery.render();
      }
    });
  }


}
