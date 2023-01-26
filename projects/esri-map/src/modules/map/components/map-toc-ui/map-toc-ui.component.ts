import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, Optional, ChangeDetectorRef } from '@angular/core';
import { MapCommonService } from '../../services/map-common.service';
import { switchMap, map, tap, filter, shareReplay, take, toArray, takeUntil, debounceTime } from 'rxjs/operators';
import { of, Observable, BehaviorSubject, Subject, from, combineLatest } from 'rxjs';
import * as apiModel from '../../models/api-request.models';
import esri = __esri; // Esri TypeScript Types
import { MatCheckboxChange } from '@angular/material/checkbox';
import { LooseObject, LayerSettingChangeModel, LayerLabelChangeModel } from '../../models/map-model.model';
import { DomSanitizer } from '@angular/platform-browser';
import { MapViewComponent } from '../map-view/map-view.component';


interface SublayerTree extends esri.Sublayer {
  hasLegends: boolean;
  hasLabel: boolean;
  hasQuery: boolean;
  identifiable: boolean;
  checked: boolean;
  isGroupLayer: boolean;
  legends: apiModel.MapLegendDetail[];
  subLayers: SublayerTree[];
  showLegendImage: boolean;
  isInViewScale: boolean;
}



@Component({
  selector: 'map-toc-ui',
  templateUrl: './map-toc-ui.component.html',
  styleUrls: ['./map-toc-ui.component.scss']
})
export class MapTocUIComponent implements OnInit, OnDestroy {


  isloading = false;
  private readonly isDestroyed$ = new Subject<void>();

  readonly mapUrl$ = new BehaviorSubject<string>(null);
  readonly mapScale$ = new Subject<number>();
  readonly mapSubLayers$ = this.mapUrl$.pipe(
    switchMap(url => this.mapCommonService.getSublayersInfo(url)),
    map(e => e as SublayerTree[])
  );
  readonly mapInfo$ = this.mapUrl$.pipe(
    filter(e => e != null),
    switchMap(url => this.mapCommonService.getUrljsonInfo(url)),
    takeUntil(this.isDestroyed$),
    shareReplay(1)
  );
  readonly mapLegends$ = this.mapUrl$.pipe(
    filter(e => e != null),
    switchMap(url => this.mapCommonService.getUrljsonInfo(`${url}/legend`).pipe(
      map(e => e.layers as apiModel.MapLegend[]))
    ),
    takeUntil(this.isDestroyed$),
    shareReplay(1),
  );

  readonly tocLayerTree$ = combineLatest([this.mapSubLayers$, this.mapLegends$]).pipe(
    switchMap(([subLayers, legends]) => from(subLayers).pipe(
      tap(subLayer => {
        this.buildTree2(subLayer, legends);
        return of(subLayer);
      }),
      toArray(),
    )),
    shareReplay(1)
  );




  @Input() tocIndex = 0;
  @Input() set mapScale(input: number) {
    this.mapScale$.next(input);
    this.temp = input;
  }

  temp: number;

  @Input() set url(input: string) {
    this.mapUrl$.next(input);
  }
  get url() {
    return this.mapUrl$.value;
  }
  @Input() isMapLoading: boolean;
  @Output() layerVisibleChange = new EventEmitter<LayerSettingChangeModel>();
  @Output() layerLabelChange = new EventEmitter<LayerLabelChangeModel>();

  constructor(private mapCommonService: MapCommonService, private domSanitizer: DomSanitizer, @Optional() private mapComponent: MapViewComponent, private changeRef: ChangeDetectorRef) { }
  ngOnDestroy(): void {
    this.isDestroyed$.next();
    this.isDestroyed$.complete();
  }

  ngOnInit(): void {
    this.mapScale$.pipe(
      debounceTime(500),
      switchMap(scale => this.tocLayerTree$.pipe(
        take(1),
        map(treeItems => {
          return {
            scale: scale,
            treeItems: treeItems
          }
        })
      )),
      takeUntil(this.isDestroyed$)
    ).subscribe({
      next: ({ scale, treeItems }) => {
        this.checkToSeeIfLayerIsWithinDisplayScale(scale, treeItems);
        this.changeRef.markForCheck();
      }
    });
  }

  private checkToSeeIfLayerIsWithinDisplayScale(scale: number, treeItems: SublayerTree[]) {
    if (treeItems) {
      treeItems.forEach(item => {
        item.isInViewScale = (item.minScale == 0 ? Number.MAX_VALUE : item.minScale) >= scale && scale >= (item.maxScale == 0 ? 0 : item.maxScale);
        this.checkToSeeIfLayerIsWithinDisplayScale(scale, item.subLayers);
      });
    }
  }


  showHideLayerLegend(layer: SublayerTree) {
    layer.showLegendImage = !layer.showLegendImage;
  }
  onLayerSelectChange(event: MatCheckboxChange, layer: SublayerTree, mapInfo: LooseObject, layers: SublayerTree[], keyPress: string) {
    let visible = event.checked;
    let layerIds = [layer.id];
    if (keyPress === 'Control') {
      // select all or turn off all
      layerIds = layers.map(e => e.id);
      layers.forEach(e => {
        e.checked = visible;
      });

    } else if (keyPress === 'Alt') {
      // close all but select
      // turn off all other layers

      const offLayers = layers.map(e => e.id).filter(e => e !== layer.id);
      layers.forEach(e => {
        if (offLayers.indexOf(e.id) !== -1) {
          e.checked = false;
        }
      });

      this.layerVisibleChange.emit({
        mapUrl: this.mapUrl$.value,
        visible: false,
        layerid: offLayers,
      });
      // set layer check
      layer.checked = true;

      // if alt is press visible is alway true
      visible = true;
    }

    this.changeRef.markForCheck();
    this.layerVisibleChange.emit({
      mapUrl: this.mapUrl$.value,
      visible,
      layerid: layerIds,
    });
  }
  toggleLabel(infoDetail: SublayerTree) {
    infoDetail.labelsVisible = !infoDetail.labelsVisible;
    this.layerLabelChange.emit({
      mapUrl: this.mapUrl$.value,
      visible: infoDetail.labelsVisible,
      layerid: [infoDetail.id]
    });
  }

  getIdentifiableLayerIds(): Observable<{ id: number, fields: esri.Field[] }[]> {
    return this.tocLayerTree$.pipe(
      take(1),
      switchMap(layers => from(layers).pipe(
        filter(layerInfo => layerInfo.identifiable && layerInfo.hasQuery && layerInfo.checked),
        map(e => {
          return {
            id: e.id,
            fields: e.fields
          };
        })
      )),
      toArray()
    );
  }

  getSubLayers(): Observable<esri.Sublayer[]> {
    return this.tocLayerTree$.pipe(
      take(1),
    );
  }
  zoomToMapLayer($event, mapInfo) {
    $event.preventDefault();
    $event.stopPropagation();
    let fullExtent = mapInfo?.fullExtent;
    if (this.mapComponent && fullExtent) {
      this.mapComponent.zoomToExtent(fullExtent).subscribe();
    }
  }

  private buildTree2(layer: SublayerTree, legends: apiModel.MapLegend[]) {
    if (layer) {
      layer.subLayers = layer.sublayers?.toArray() as SublayerTree[];
      layer.isGroupLayer = layer.sublayers === null ? false : true;
      layer.checked = layer.visible;
      layer.hasLabel = layer.labelingInfo != null;
      layer.hasQuery = layer.layer.capabilities.operations.supportsQuery;
      layer.identifiable = true;
      layer.legends = legends.find(e => e.layerId == layer.id)?.legend || [];
      layer.hasLegends = layer.legends?.length > 0;
      layer.showLegendImage = true;
      if (layer.hasLegends) {

        layer.legends.forEach(l => {
          l.base64Image = this.domSanitizer.bypassSecurityTrustResourceUrl(`data:${l.contentType};base64, ${l.imageData}`);
        });
      }
      layer.subLayers?.forEach(e => this.buildTree2(e, legends));
    }
  }
}
