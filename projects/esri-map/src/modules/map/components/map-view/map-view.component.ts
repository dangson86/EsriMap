import { Component, OnInit, ViewChild, ElementRef, OnDestroy, Output, EventEmitter, ContentChildren, AfterContentInit, QueryList, Input } from '@angular/core';
import { from, Subject, Observable, of, fromEvent } from 'rxjs';
import { loadCss, loadScript } from 'esri-loader';
import { switchMap, tap, takeUntil, shareReplay, map } from 'rxjs/operators';
import { MapCommonService } from '../../services/map-common.service';
import { MapInitModel, LayerSettingChangeModel, LayerLabelChangeModel } from '../../models/map-model.model';
import { MapUrlDirective } from './directives/map-url.directive';
import { MapTocDirective } from './directives/map-toc.directive';
import esri = __esri; // Esri TypeScript Types
import { layer } from 'esri/views/3d/support/LayerPerformanceInfo';

@Component({
  // tslint:disable-next-line: component-selector
  selector: 'map-view',
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.scss']
})
export class MapViewComponent implements OnInit, OnDestroy, AfterContentInit {
  @Input() sceneView = false;
  @Output() loaded = new EventEmitter<MapInitModel>();
  @Output() isLoading = new EventEmitter<boolean>();
  @ViewChild('mapView', { static: true }) mapViewElement: ElementRef;
  @ContentChildren(MapUrlDirective) layerUrlList!: QueryList<MapUrlDirective>;
  @ContentChildren(MapTocDirective) tocUrlList!: QueryList<MapTocDirective>;

  private readonly loadEsriBaseScript$ = from(loadScript({
    url: 'https://js.arcgis.com/4.15/'
  }).then(e => {
    loadCss('https://js.arcgis.com/4.15/esri/themes/light/main.css');
  }));
  private readonly isDestroyed$ = new Subject<any>();
  private mapInitModel: MapInitModel;

  private readonly initMap$: Observable<MapInitModel> = this.loadEsriBaseScript$.pipe(
    switchMap(e => this.mapCommonService.loadModules('esri/Map', 'esri/views/MapView', 'esri/views/SceneView', 'esri/core/watchUtils')),
    switchMap(([Map, MapView, SceneView, watchUtils]) => {
      this.clearStaticText();
      const newMap: esri.Map = new Map({
        basemap: 'topo-vector'
      });
      this.mapInitModel = new MapInitModel();
      this.isLoading.emit(true);
      if (this.sceneView) {
        const view: esri.SceneView = new SceneView({
          container: this.mapViewElement.nativeElement,
          map: newMap,
          center: [-95.437389, 29.763206],
          zoom: 4
        });
        this.mapInitModel.mapView = view;
        view.ui.move(['zoom', 'navigation-toggle', 'compass'], 'top-right');
      } else {
        const view: esri.MapView = new MapView({
          container: this.mapViewElement.nativeElement,
          map: newMap,
          center: [-95.437389, 29.763206],
          zoom: 4
        });
        this.mapInitModel.mapView = view;
      }
      this.mapInitModel.mapView.watch('scale', e => {
        this.mapScale = e;
      });
      this.mapInitModel.mapView.watch('updating', (e: boolean) => {
        this.isLoading.emit(e);
      });
      this.mapInitModel.map = newMap;
      return of(this.mapInitModel);
    }),
    tap(e => {
      this.loaded.emit(e);
    }),
    takeUntil(this.isDestroyed$),
    shareReplay(1)
  );
  showTocPannel = true;
  showBottomPannel: boolean;
  mapScale: number;


  readonly uiConfig = {
    bottomPanel: {
      height: 25,
      bottom: -25
    }
  };

  private readonly hostMouseMove$: Observable<MouseEvent> = fromEvent(this.elRef.nativeElement, 'mousemove');
  private readonly hostMouseUp$ = fromEvent(this.elRef.nativeElement, 'mouseup');
  constructor(private mapCommonService: MapCommonService, private elRef: ElementRef) {

  }

  ngAfterContentInit(): void {
    this.initConfig();
    // adding layer from directive
    this.layerUrlList.forEach(layerUrl => {
      if (layerUrl.url) {
        this.addLayer(layerUrl.id, layerUrl.url).pipe(
          switchMap(view => this.zoomToExtent(view.layer.fullExtent).pipe(
            map(e => view)
          ))
        ).subscribe(e => { }, err => { }, () => { });

        layerUrl.urlChange.pipe(
          switchMap(e => this.addLayer(e.id, e.url)),
          switchMap(view => this.zoomToExtent(view.layer.fullExtent)),
          takeUntil(this.isDestroyed$)
        ).subscribe();
      }
    });
  }

  ngOnInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.isDestroyed$.next();
  }
  toggleLeftMenu() {
    this.showTocPannel = !this.showTocPannel;
  }
  toggleBottomPanel() {
    this.showBottomPannel = !this.showBottomPannel;
  }
  addLayer(layerId: string, layerUrl: string): Observable<esri.LayerView> {
    return this.initMap$.pipe(
      switchMap(mapModel => this.mapCommonService.loadModules('esri/layers/MapImageLayer').pipe(
        switchMap(([MapImageLayer]) => {
          const oldLayer = mapModel.map.findLayerById(layerId);
          if (oldLayer) {
            mapModel.map.remove(oldLayer);
          }

          const newImagelayer: esri.MapImageLayer = new MapImageLayer({
            id: layerId,
            url: layerUrl
          });

          mapModel.map.add(newImagelayer);  // adds the layer to the map
          const onView = mapModel.mapView.whenLayerView(newImagelayer);
          return from(onView);
        })
      ))
    );
  }

  zoomToExtent(fullExtent: esri.Extent) {
    return this.initMap$.pipe(
      switchMap(mapModel => {
        const view = mapModel.mapView;
        return this.mapCommonService.projectGeometry([fullExtent], view.spatialReference).pipe(
          switchMap(geometries => from(view.goTo(geometries)))
        );
      })
    );
  }
  onLayerSettingChange(event: LayerSettingChangeModel) {
    this.setLayerVisible(event.mapUrl, event.layerid, event.visible);
  }
  onLayerLabelChange(event: LayerLabelChangeModel) {
    this.setLayerLabelVisible(event.mapUrl, event.layerid, event.visible);
  }
  setLayerVisible(mapUrl: string, layerId: number[], visible: boolean) {
    const subLayers = this.findSubLayer(mapUrl, layerId);
    subLayers.forEach(l => {
      l.visible = visible;
    });
  }
  setLayerLabelVisible(mapUrl: string, layerId: number[], visible: boolean) {
    const subLayers = this.findSubLayer(mapUrl, layerId);
    subLayers.forEach(l => {
      l.labelsVisible = visible;
    });
  }
  onBottomPanelResize(event: DragEvent) {
    const currentScreenY = event.screenY;
    const currentHeight = this.uiConfig.bottomPanel.height;
    this.hostMouseMove$.pipe(
      tap(e => {
        const ratio = currentScreenY - e.screenY;
        this.setBottomPanelHeight(currentHeight + ratio);
      }),
      takeUntil(this.hostMouseUp$),
    ).subscribe();
  }
  private findSubLayer(mapUrl: string, layerId: number[]): esri.Sublayer[] {
    const mapSettings = this.layerUrlList.filter(e => e.url === mapUrl);
    if (mapSettings.length > 0) {
      const mapImageLayer = this.mapInitModel.map.findLayerById(mapSettings[0].id) as esri.MapImageLayer;
      if (mapImageLayer) {
        return layerId.map(id => mapImageLayer.findSublayerById(id));
      }
    }
    return [];
  }
  private initMap() {
    this.initMap$.subscribe();
  }

  private clearStaticText() {
    // clear static text
    this.mapViewElement.nativeElement.textContent = null;
  }
  private initConfig() {

    // set init height to 25% of the map height
    const bottomPanelHeight = this.elRef.nativeElement.clientHeight * 0.25;
    this.setBottomPanelHeight(bottomPanelHeight);
  }
  private setBottomPanelHeight(bottomPanelHeight: number) {
    this.uiConfig.bottomPanel.height = bottomPanelHeight;
    this.uiConfig.bottomPanel.bottom = bottomPanelHeight * -1;
  }
}
