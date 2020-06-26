import { Component, OnInit, ViewChild, ElementRef, OnDestroy, Output, EventEmitter, ContentChildren, AfterContentInit, QueryList, Input, ViewChildren } from '@angular/core';
import { from, Subject, Observable, of, fromEvent, merge } from 'rxjs';
import { loadCss, loadScript } from 'esri-loader';
import { switchMap, tap, takeUntil, shareReplay, map, mergeMap, filter, toArray, catchError, defaultIfEmpty } from 'rxjs/operators';
import { MapCommonService } from '../../services/map-common.service';
import { MapInitModel, LayerSettingChangeModel, LayerLabelChangeModel, ExecuteIdentifyTaskResult } from '../../models/map-model.model';
import { MapUrlDirective } from './directives/map-url.directive';
import { MapTocDirective } from './directives/map-toc.directive';
import esri = __esri; // Esri TypeScript Types
import { MapTocUIComponent } from '../map-toc-ui/map-toc-ui.component';

declare type availableToolNames = 'identifyTool' | 'zoomIn' | 'zoomOut' | 'unknowTool' | 'noSelectTool';
interface MapCompUiConfig {
  showTocPannel: boolean;
  showBottomPannel: boolean;
  bottomPanel: {
    height: number,
    bottom: number
  };
  leftMenuTools: {
    selectedTool: availableToolNames
  };
}

@Component({
  // tslint:disable-next-line: component-selector
  selector: 'map-view',
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.scss']
})
export class MapViewComponent implements OnInit, OnDestroy, AfterContentInit {
  @Input() sceneView = false;
  @Output() readonly loaded = new EventEmitter<MapInitModel>();
  @Output() readonly isLoading = new EventEmitter<boolean>();
  @Output() readonly toolChange = new EventEmitter<availableToolNames>();
  @Output() readonly mapClick = new EventEmitter<esri.geometry.Point>();
  @Output() readonly identifyReturn = new EventEmitter<ExecuteIdentifyTaskResult[]>();

  @ViewChild('mapView', { static: true }) mapViewElement: ElementRef;
  @ContentChildren(MapUrlDirective) layerUrlList!: QueryList<MapUrlDirective>;
  @ContentChildren(MapTocDirective) tocUrlList!: QueryList<MapTocDirective>;

  @ViewChildren(MapTocUIComponent) tocComponents: QueryList<MapTocUIComponent>;

  private readonly isDestroyed$ = new Subject<any>();
  private mapInitModel: MapInitModel;

  private readonly initMap$: Observable<MapInitModel> = this.mapCommonService.loadEsriBaseScript$.pipe(
    switchMap(e => this.mapCommonService.loadModules('esri/Map', 'esri/views/MapView', 'esri/views/SceneView', 'esri/core/watchUtils')),
    switchMap(([Map, MapView, SceneView, watchUtils]) => {
      this.clearStaticText();
      const newMap: esri.Map = new Map({
        basemap: 'topo-vector'
      });

      // this.sceneView = false;

      this.mapInitModel = new MapInitModel();
      this.isLoading.emit(true);
      if (this.sceneView) {
        const tempView: esri.SceneView = new SceneView({
          container: this.mapViewElement.nativeElement,
          map: newMap,
          center: [-95.437389, 29.763206],
          zoom: 4
        });
        this.mapInitModel.mapView = tempView;

      } else {
        const tempView: esri.MapView = new MapView({
          container: this.mapViewElement.nativeElement,
          map: newMap,
          center: [-95.437389, 29.763206],
          zoom: 4
        });
        this.mapInitModel.mapView = tempView;
      }
      const view = this.mapInitModel.mapView;
      view.ui.move(['zoom', 'navigation-toggle', 'compass'], 'top-right');

      view.watch('scale', e => {
        this.mapScale = e;
      });
      view.watch('updating', (e: boolean) => {
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
  mapScale: number;


  readonly uiConfig: MapCompUiConfig = {
    showTocPannel: true,
    showBottomPannel: false,
    bottomPanel: {
      height: 25,
      bottom: -25
    },
    leftMenuTools: {
      selectedTool: 'noSelectTool'
    }
  };

  private readonly hostMouseMove$: Observable<MouseEvent> = fromEvent(this.elRef.nativeElement, 'mousemove');
  private readonly hostMouseUp$ = fromEvent(this.elRef.nativeElement, 'mouseup');
  identifyResults: ExecuteIdentifyTaskResult[];
  constructor(private mapCommonService: MapCommonService, private elRef: ElementRef) {

  }

  ngAfterContentInit(): void {
    this.initConfig();
    // adding layer from directive
    this.layerUrlList.forEach(layerUrl => {
      if (layerUrl.url) {
        merge(
          of({ id: layerUrl.id, url: layerUrl.url }), // init layer
          layerUrl.urlChange.pipe(map(e => ({ id: e.id, url: e.url })))// change layer if url change
        ).pipe(
          switchMap(e => this.addLayer(e.id, e.url)),
          switchMap(view => this.zoomToExtent(view.layer.fullExtent).pipe(
            map(e => view)
          )),
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
  activateTool(toolName: availableToolNames) {

    if (this.uiConfig.leftMenuTools.selectedTool !== toolName) {
      this.uiConfig.leftMenuTools.selectedTool = toolName;
    } else {
      this.uiConfig.leftMenuTools.selectedTool = 'noSelectTool';
    }
    this.toolChange.emit(this.uiConfig.leftMenuTools.selectedTool);
    switch (this.uiConfig.leftMenuTools.selectedTool) {
      case 'identifyTool':
        this.drawIdentifyRectangle().pipe(
          tap(e => {
            this.isLoading.next(true);
          }),
          switchMap(geometry => from(this.tocComponents.map(e => e)).pipe(
            mergeMap(toc => {
              const view = this.mapInitModel.mapView;
              return toc.getIdentifiableLayerIds().pipe(
                mergeMap(layerIds => {
                  if (layerIds && layerIds.length > 0) {
                    return this.mapCommonService.executeIdentifyTask(toc.url, view.width, view.height, layerIds, view.extent, geometry).pipe(
                      catchError(error => {
                        console.error(error);
                        return of<ExecuteIdentifyTaskResult>(null);
                      })
                    );
                  }
                  return of<ExecuteIdentifyTaskResult>(null);
                })
              );
            }),
            // defaultIfEmpty(null),
            // filter(e => e != null),
            toArray()
          )),
          tap(e => {
            this.clearSelectedTool();
            this.isLoading.next(false);
            if (e && e.length > 0) {
              this.uiConfig.showBottomPannel = true;
              this.identifyResults = e;
            }

            this.identifyReturn.emit(e);
          }),
        ).subscribe(e => {
          console.log(e);

        });
        break;
      case 'zoomIn':
        break;
      case 'zoomOut':
        break;
      default:
        break;
    }
  }
  toggleLeftMenu() {
    this.uiConfig.showTocPannel = !this.uiConfig.showTocPannel;
  }
  toggleBottomPanel() {
    this.uiConfig.showBottomPannel = !this.uiConfig.showBottomPannel;
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
    this.initMap$.pipe(
      switchMap(mapModel => this.mapCommonService.loadModules('esri/views/draw/Draw').pipe(
        tap(([Draw]) => {
          const draw: esri.Draw = new Draw({
            view: mapModel.mapView
          });
          mapModel.mapTools.draw = draw;
        })
      )
      )).subscribe();
  }
  // private attachClickEvent() {
  //   if (this.mapInitModel.events.click == null) {
  //     this.mapInitModel.events.click = this.mapInitModel.mapView.on('click', e => {
  //       this.mapClick.emit(e.mapPoint);
  //     });
  //   }
  // }
  private drawIdentifyRectangle(): Observable<esri.Geometry> {
    return this.initMap$.pipe(
      switchMap(mapModel => this.mapCommonService.loadModules('esri/geometry/Polygon', 'esri/Graphic').pipe(
        switchMap(([Polygon, Graphic]) => {
          const view = mapModel.mapView;
          view.focus();
          const drawAction = mapModel.mapTools.draw.create('rectangle') as esri.SegmentDrawAction;
          const sp = mapModel.mapView.spatialReference;
          const graphics = mapModel.mapView.graphics;
          // fires when the pointer moves

          const customSymbol = {
            type: 'simple-fill',  // autocasts as new SimpleFillSymbol()
            // color: [51, 51, 204, 0.9],
            style: 'none',
            outline: {  // autocasts as new SimpleLineSymbol()
              color: '#ff4081',
              width: 1,
              style: 'short-dash'
            }
          };

          drawAction.on('cursor-update', (evt) => {
            const polygon: esri.Polygon = new Polygon({
              rings: evt.vertices,
              spatialReference: sp
            });
            graphics.removeAll();

            const graphic: esri.Graphic = new Graphic({
              geometry: polygon.extent,
              symbol: customSymbol,
              attributes: null
            });
            graphics.add(graphic);
          });

          const result = new Subject<esri.Extent>();
          // fires when the drawing is completed
          drawAction.on('draw-complete', (evt) => {
            graphics.removeAll();
            const polygon: esri.Polygon = new Polygon({
              rings: evt.vertices,
              spatialReference: sp
            });

            result.next(polygon.extent);
            result.complete();
          });

          return result;
        })
      )),
    );
  }

  // private measureLine(vertices) {
  //   this.mapInitModel.mapView.graphics.removeAll();

  //   var line = createLine(vertices);
  //   var lineLength = geometryEngine.geodesicLength(line, "miles");
  //   var graphic = createGraphic(line);
  //   view.graphics.add(graphic);
  // }
  private clearSelectedTool() {
    this.uiConfig.leftMenuTools.selectedTool = 'noSelectTool';
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
