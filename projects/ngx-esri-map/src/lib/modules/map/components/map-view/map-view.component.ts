import { Component, OnInit, ViewChild, ElementRef, OnDestroy, Output, EventEmitter, ContentChildren, AfterContentInit, QueryList, Input, ViewChildren, ChangeDetectionStrategy, ChangeDetectorRef, Optional, ContentChild } from '@angular/core';
import { from, Subject, Observable, of, fromEvent, BehaviorSubject } from 'rxjs';
import { switchMap, tap, takeUntil, shareReplay, mergeMap, toArray, catchError, map, take, finalize } from 'rxjs/operators';
import { MapCommonService } from '../../services/map-common.service';
import { MapInitModel, LayerSettingChangeModel, LayerLabelChangeModel, ExecuteIdentifyTaskResult, LooseObject } from '../../models/map-model.model';
import { MapUrlDirective } from './directives/map-url.directive';
import { MapTocUIComponent } from '../map-toc-ui/map-toc-ui.component';
import Point from "@arcgis/core/geometry/Point";
import Map from "@arcgis/core/Map";
import SceneView from "@arcgis/core/views/SceneView";
import MapView from "@arcgis/core/views/MapView";
import LayerView from "@arcgis/core/views/layers/LayerView";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import Extent from "@arcgis/core/geometry/Extent";
import Sublayer from "@arcgis/core/layers/support/Sublayer";
import Draw from "@arcgis/core/views/draw/Draw";
import Geometry from "@arcgis/core/geometry/Geometry";
import Graphic from "@arcgis/core/Graphic";
import Polygon from "@arcgis/core/geometry/Polygon";
import { FeatureTemplateDirective } from './directives/feature-template.directive';



declare type leftMemuToolNames = 'identifyTool' | 'zoomIn' | 'zoomOut' | 'unknowTool' | 'noSelectTool' | 'drawTool';
interface MapCompUiConfig {
  showTocPannel: boolean;
  showBottomPannel: boolean;
  bottomPanel: {
    height: number,
  };
  leftMenuTools: {
    selectedTool: leftMemuToolNames
  };
}

@Component({
  // tslint:disable-next-line: component-selector
  selector: 'map-view',
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapViewComponent implements OnInit, OnDestroy, AfterContentInit {


  private readonly sceneView$ = new BehaviorSubject<boolean>(true);
  @Input() set sceneView(input: boolean) {
    this.sceneView$.next(input);
  }
  get sceneView() {
    return this.sceneView$.value;
  }
  @Input() set authToken(input: string) {
    this.setAuthToken(input);
  }

  @Output() readonly loaded = new EventEmitter<MapInitModel>();
  @Output() readonly isLoading = new EventEmitter<boolean>();
  @Output() readonly toolChange = new EventEmitter<leftMemuToolNames>();
  @Output() readonly mapClick = new EventEmitter<Point>();
  @Output() readonly identifyReturn = new EventEmitter<ExecuteIdentifyTaskResult[]>();

  @ViewChild('mapView', { static: true }) mapViewElement: ElementRef;
  @ViewChild('leftmenuResizeBtn', { static: true }) leftMenuResizeBtn: ElementRef;
  @ContentChildren(MapUrlDirective) layerUrlList!: QueryList<MapUrlDirective>;
  @ContentChild(FeatureTemplateDirective) featureTemplate!: FeatureTemplateDirective;
  @ViewChildren(MapTocUIComponent) tocComponents: QueryList<MapTocUIComponent>;

  private readonly isDestroyed$ = new Subject<void>();
  private mapInitModel: MapInitModel;
  get mapInstance() { return this.mapInitModel.map; }
  get mapView() { return this.mapInitModel.mapView; }
  readonly initMap$: Observable<MapInitModel> = this.mapCommonService.loadEsriBaseScript$.pipe(
    switchMap((e) => {
      this.clearStaticText();
      const newMap: Map = new Map({
        basemap: 'topo-vector'
      });

      if (this.mapInitModel) {
        this.removeOldMap();
      }

      this.mapInitModel = new MapInitModel();
      if (this.sceneView) {
        const tempView: SceneView = new SceneView({
          container: this.mapViewElement.nativeElement,
          map: newMap,
          center: [-95.437389, 29.763206],
          zoom: 4
        });
        this.mapInitModel.mapView = tempView;

      } else {
        const tempView: MapView = new MapView({
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
        this.cdr.markForCheck();
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
    },
    leftMenuTools: {
      selectedTool: 'noSelectTool'
    }
  };
  @ViewChild('bottomPannelWrapper', { static: true }) private bottomPanelElement: ElementRef;
  private readonly hostMouseMove$: Observable<MouseEvent> = fromEvent(this.elRef.nativeElement, 'mousemove');
  private readonly hostMouseUp$ = fromEvent(this.elRef.nativeElement, 'mouseup');
  identifyResults: ExecuteIdentifyTaskResult[];
  constructor(private mapCommonService: MapCommonService, private elRef: ElementRef, private cdr: ChangeDetectorRef) {

  }
  setAuthToken(authToken: string) {
    if (authToken) {
      this.mapCommonService.registerAuthToken(authToken, "https://epic.ensiteusa.com/arcgis/rest/services");
    }
  }
  ngAfterContentInit(): void {
    this.initConfig();
    this.layerUrlList.changes.pipe(
      tap(e => {
        this.cdr.markForCheck();
      }),
      takeUntil(this.isDestroyed$)
    ).subscribe();
    console.log(this.featureTemplate);
  }

  ngOnInit(): void {
    this.initMap();
  }
  onLefPanelResize(mouseDown: MouseEvent, leftPanel: any) {
    const currentValue = leftPanel.clientWidth;
    this.elRef.nativeElement.style.cursor = 'col-resize';
    const target = mouseDown.target as any;
    target.style.cursor = 'col-resize';
    this.hostMouseMove$.pipe(
      tap(e => {
        const ratio = e.clientX - mouseDown.clientX;
        const newWidth = currentValue + ratio;
        leftPanel.style.width = `${newWidth}px`;
      }),
      takeUntil(this.hostMouseUp$.pipe(
        tap(() => {
          this.elRef.nativeElement.style.cursor = 'unset';
          target.style.cursor = 'pointer';
        }))),
    ).subscribe();
  }
  ngOnDestroy(): void {
    this.isDestroyed$.next();
  }
  activateTool(toolName: leftMemuToolNames) {
    if (this.uiConfig.leftMenuTools.selectedTool !== toolName) {
      this.uiConfig.leftMenuTools.selectedTool = toolName;
    } else {
      this.uiConfig.leftMenuTools.selectedTool = 'noSelectTool';
      this.resetAllTools();
    }

    this.toolChange.emit(this.uiConfig.leftMenuTools.selectedTool);
    switch (this.uiConfig.leftMenuTools.selectedTool) {
      case 'identifyTool':
        this.activateIdentifyTool();
        break;
      case 'zoomIn':
        break;
      case 'zoomOut':
        break;
      case 'drawTool':
        break;
      default:
        break;
    }
  }
  private activateIdentifyTool() {
    this.drawIdentifyRectangle().pipe(
      tap(e => {
        this.isLoading.next(true);
      }),
      switchMap(geometry => from(this.tocComponents.map(e => e)).pipe(
        mergeMap(toc => {
          const view = this.mapInitModel.mapView;
          return toc.getIdentifiableLayerIds().pipe(
            mergeMap(layers => {
              const defaultValue = of<ExecuteIdentifyTaskResult>(null);
              const layerIds = layers?.map(e => e.id);
              if (layerIds && layerIds.length > 0) {
                return this.mapCommonService.executeIdentifyTask(toc.url, view.width, view.height, layerIds, view.extent, geometry).pipe(
                  tap(taskResult => {
                    taskResult?.layerResults.forEach((layerResult: LooseObject) => {
                      layerResult.fields = layers.find(f => f.id === layerResult.layerId)?.fields;
                    });
                  }),
                  catchError(error => {
                    console.error(error);
                    return defaultValue;
                  })
                );
              }
              return defaultValue;
            })
          );
        }),
        toArray()
      )),
      map(e => {
        this.identifyResults = null;
        if (e && e.length > 0) {
          this.identifyResults = e.filter(f => f !== null);
          if (this.identifyResults.length > 0) {
            this.uiConfig.showBottomPannel = true;
          }
        }
        return this.identifyResults;
      }),
      tap(e => {
        this.clearSelectedTool();
        this.isLoading.next(false);
        this.identifyReturn.emit(e);
      }),
    ).subscribe(e => {
      console.log(e);
    });
  }
  private resetDrawToolAction() {
    const drawAction = this.mapInitModel.mapTools.draw.activeAction;
    if (drawAction) {
      // this.mapInitModel.mapTools.draw.reset();
      this.mapInitModel.mapTools.draw.complete();
      console.log("reset");
    }
  }
  private resetAllTools() {
    this.resetDrawToolAction();
    this.cdr.markForCheck();
  }

  toggleLeftMenu() {
    this.uiConfig.showTocPannel = !this.uiConfig.showTocPannel;
  }
  toggleBottomPanel() {
    this.uiConfig.showBottomPannel = !this.uiConfig.showBottomPannel;
  }
  addLayer(layerId: string, layerUrl: string): Observable<LayerView> {
    return this.initMap$.pipe(
      switchMap((mapModel) => {
        this.isLoading.next(true);
        const map = mapModel.map;
        const oldLayer = map.findLayerById(layerId) as MapImageLayer;
        let isAdded = false;
        if (oldLayer) {
          if (oldLayer.id === layerId && oldLayer.url === layerUrl) {
            isAdded = true;
            oldLayer.refresh();
          } else {
            map.remove(oldLayer);
          }
        }

        if (isAdded) {
          return from(mapModel.mapView.whenLayerView(oldLayer)).pipe(
            tap(e => {
              this.isLoading.next(false);
            })
          );
        } else {
          const newImagelayer: MapImageLayer = new MapImageLayer({
            id: layerId,
            url: layerUrl
          });

          map.add(newImagelayer);  // adds the layer to the map
          const onView = mapModel.mapView.whenLayerView(newImagelayer);
          return from(onView).pipe(
            finalize(() => {
              this.isLoading.next(false);
            }),
            catchError(error => {
              console.error(`fail to add layer ${layerId} ${layerUrl}`, error);
              throw error;
            })
          );
        }
      })
    );
  }

  removeLayer(layerId: string, layerUrl: string) {
    if (this.mapInitModel && this.mapInitModel.map) {
      const mapInstance = this.mapInitModel.map;
      const oldLayer = mapInstance.findLayerById(layerId) as MapImageLayer;
      if (oldLayer) {
        mapInstance.remove(oldLayer);
      }
    }
  }

  zoomToExtent(fullExtent: Extent) {
    return this.initMap$.pipe(
      switchMap(mapModel => {
        const view = mapModel.mapView;
        return this.mapCommonService.projectGeometry([fullExtent], view.spatialReference).pipe(
          switchMap(geometries => from(view.goTo(geometries)).pipe(
            catchError(error => {
              console.error('zoom fail', error);
              return of(null);
            })
          ))
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
    this.hostMouseMove$.pipe(
      tap(e => {
        const hostClientHeight = this.elRef.nativeElement.clientHeight;
        const ratio = hostClientHeight - e.clientY;
        this.setBottomPanelHeight(ratio);
      }),
      takeUntil(this.hostMouseUp$),
    ).subscribe();
  }

  onDrawCompleted(event) {
    console.log(event);
  }

  private findSubLayer(mapUrl: string, layerId: number[]): Sublayer[] {
    const mapSetting = this.layerUrlList.find(e => e.url === mapUrl);
    if (mapSetting) {
      const mapImageLayer = this.mapInitModel.map.findLayerById(mapSetting.id) as MapImageLayer;
      if (mapImageLayer) {
        return layerId.map(id => mapImageLayer.findSublayerById(id));
      }
    }
    return [];
  }
  private initMap() {
    this.initMap$.pipe(
      tap(mapModel => {
        if (mapModel.mapView instanceof MapView) {
          const draw: Draw = new Draw({
            view: mapModel.mapView
          });
          mapModel.mapTools.draw = draw;
        }
      })
    ).subscribe();
  }

  private drawIdentifyRectangle(): Observable<Geometry> {
    return this.initMap$.pipe(
      switchMap(mapModel => {
        const view = mapModel.mapView;
        view.focus();
        const drawAction = mapModel.mapTools.draw.activeAction = mapModel.mapTools.draw.create('rectangle');
        const sp = mapModel.mapView.spatialReference;
        const graphics = mapModel.mapView.graphics;

        const customSymbol = {
          type: 'simple-fill',  // autocasts as new SimpleFillSymbol()
          // color: [51, 51, 204, 0.9],
          outline: {  // autocasts as new SimpleLineSymbol()
            color: '#ff4081',
            width: 1,
            style: 'short-dash'
          }
        };

        drawAction.on('cursor-update', (evt) => {
          const polygon: Polygon = new Polygon({
            rings: evt.vertices,
            spatialReference: sp
          });
          graphics.removeAll();

          const graphic: Graphic = new Graphic({
            geometry: polygon.extent,
            symbol: customSymbol as any,
            attributes: null
          });
          graphics.add(graphic);
        });

        const result = new Subject<Extent>();
        // fires when the drawing is completed
        drawAction.on('draw-complete', (evt) => {
          graphics.removeAll();
          const polygon: Polygon = new Polygon({
            rings: evt.vertices,
            spatialReference: sp
          });

          result.next(polygon.extent);
          result.complete();
        });
        return result;
      })
    );
  }

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
    if (this.bottomPanelElement) {
      this.bottomPanelElement.nativeElement.style.height = `${bottomPanelHeight}px`;
    }
  }
  private removeOldMap() {
    if (this.mapInitModel?.map) {
      this.mapInitModel.map.destroy();
    }
  }
}
