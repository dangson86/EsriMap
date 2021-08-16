import { Directive, OnDestroy, OnInit, Output, EventEmitter } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { MapCommonService } from '../../../services/map-common.service';
import { MapViewComponent } from '../map-view.component';

@Directive({
  selector: 'appMapSketch'
})
export class MapSketchDirective implements OnInit, OnDestroy {

  @Output() readonly drawCompleted = new EventEmitter<__esri.Graphic>();
  private gLayer: __esri.GraphicsLayer;
  private sketchWidget: __esri.Sketch;
  readonly deafaultGraphicLayerName = 'defaultGraphicLayer';
  readonly deafaultSketchWidgetName = 'deafaultSketchWidget';
  constructor(private mapViewComp: MapViewComponent, private mapCommonService: MapCommonService) { }
  ngOnDestroy(): void {
    this.cleanUp();
  }
  ngOnInit(): void {
    this.mapViewComp.initMap$.pipe(
      switchMap(mapModel => this.inintGraphicLayer(mapModel.map, mapModel.mapView).pipe(
        switchMap(glayer => this.mapCommonService.loadModules('esri/widgets/Sketch').pipe(
          map(([Sketch]) => {
            const view = mapModel.mapView;
            const sketch: __esri.Sketch = new Sketch({
              layer: glayer,
              view,
              id: this.deafaultSketchWidgetName
            });
            this.sketchWidget = sketch;
            // Listen to sketch widget's create event.
            sketch.on('create', (event) => {
              if (event.state === 'complete') {
                const graphic: __esri.Graphic = event.graphic;
                this.drawCompleted.emit(graphic);
              }
            });
            const currentW = view.ui.find(this.deafaultSketchWidgetName);
            if (!currentW) {
              view.ui.add(sketch, 'top-right');
            }
          })
        )),
      ))
    ).subscribe();
  }
  private cleanUp() {
    if (this.gLayer) {

    }
    if (this.mapViewComp?.mapView && this.sketchWidget) {
      this.mapViewComp.mapView.ui.remove(this.sketchWidget);
    }
  }
  private inintGraphicLayer(esriMap: __esri.Map, view: __esri.View): Observable<__esri.GraphicsLayer> {
    const defaultName = this.deafaultGraphicLayerName;
    const layer = esriMap.findLayerById(this.deafaultGraphicLayerName) as __esri.GraphicsLayer;
    if (layer) {
      return of(layer);
    }
    return this.mapCommonService.createGraphicLayer(defaultName).pipe(
      tap(glayer => {
        esriMap.add(glayer);
        this.gLayer = glayer;
      })
    );
  }
}
