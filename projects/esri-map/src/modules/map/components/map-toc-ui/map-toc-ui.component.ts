import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MapCommonService } from '../../services/map-common.service';
import { switchMap, map, tap, filter, shareReplay, take, toArray, takeUntil } from 'rxjs/operators';
import { of, Observable, BehaviorSubject, Subject, from, combineLatest } from 'rxjs';
import * as apiModel from '../../models/api-request.models';
import esri = __esri; // Esri TypeScript Types
import { MatCheckboxChange } from '@angular/material/checkbox';
import { LooseObject, LayerSettingChangeModel, LayerLabelChangeModel } from '../../models/map-model.model';
import { DomSanitizer } from '@angular/platform-browser';


interface Sublayer2 extends esri.Sublayer {
  hasLegends: boolean;
  hasLabel: boolean;
  hasQuery: boolean;
  identifiable: boolean;
  checked: boolean;
  isGroupLayer: boolean;
  legends: apiModel.MapLegendDetail[];
  subLayers: Sublayer2[];
}



@Component({
  selector: 'map-toc-ui',
  templateUrl: './map-toc-ui.component.html',
  styleUrls: ['./map-toc-ui.component.scss']
})
export class MapTocUIComponent implements OnInit, OnDestroy {

  isloading = false;
  private readonly isDestroyed$ = new Subject();

  readonly mapUrl$ = new BehaviorSubject<string>(null);
  readonly mapScale$ = new Subject<number>();
  readonly mapSubLayers$ = this.mapUrl$.pipe(
    switchMap(url => this.mapCommonService.getSublayersInfo(url)),
    map(e => e as Sublayer2[])
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
        subLayer.legends = legends.find(e => e.layerId === subLayer.id)?.legend || [];
        this.buildTree2(subLayer);
        return of(subLayer);
      }),
      toArray(),
    )),
    shareReplay(1)
  );




  @Input() tocIndex = 0;
  @Input() set mapScale(input: number) {
    this.mapScale$.next(input);
  }

  @Input() set url(input: string) {
    this.mapUrl$.next(input);
  }
  get url() {
    return this.mapUrl$.value;
  }
  @Input() isMapLoading: boolean;
  @Output() layerVisibleChange = new EventEmitter<LayerSettingChangeModel>();
  @Output() layerLabelChange = new EventEmitter<LayerLabelChangeModel>();

  constructor(private mapCommonService: MapCommonService, private domSanitizer: DomSanitizer) { }
  ngOnDestroy(): void {
    this.isDestroyed$.next();
    this.isDestroyed$.complete();
  }

  ngOnInit(): void {

  }
  onLayerSelectChange(event: MatCheckboxChange, layer: Sublayer2, mapInfo: LooseObject, layers: Sublayer2[], keyPress: string) {
    let visible = event.checked;
    let layerid = [layer.id];
    if (keyPress === 'Control') {
      // select all or turn off all
      layerid = layers.map(e => e.id);
      setTimeout(() => {
        layers.forEach(e => {
          e.checked = visible;
        });
      }, 0);

    } else if (keyPress === 'Alt') {
      // close all but select
      // turn off all other layers
      setTimeout(() => {
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
      }, 0);

      // if alt is press visible is alway true
      visible = true;
    }

    this.layerVisibleChange.emit({
      mapUrl: this.mapUrl$.value,
      visible,
      layerid,
    });
  }
  toggleLabel(infoDetail: Sublayer2) {
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

  private buildTree2(subLayer: Sublayer2) {
    if (subLayer) {
      subLayer.subLayers = subLayer.sublayers?.toArray() as Sublayer2[];
      subLayer.isGroupLayer = subLayer.sublayers === null ? false : true;
      subLayer.checked = subLayer.visible;
      subLayer.hasLabel = subLayer.labelingInfo != null;
      subLayer.hasQuery = subLayer.layer.capabilities.operations.supportsQuery;
      subLayer.identifiable = true;
      subLayer.hasLegends = subLayer.legends?.length > 0;
      if (subLayer.hasLegends) {
        subLayer.legends.forEach(l => {
          l.base64Image = this.domSanitizer.bypassSecurityTrustResourceUrl(`data:${l.contentType};base64, ${l.imageData}`);
        });
      }
      subLayer.subLayers?.forEach(e => this.buildTree2(e));
    }
  }
}
