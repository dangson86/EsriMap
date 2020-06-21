import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { MapCommonService } from '../../services/map-common.service';
import { switchMap, map, tap, filter, shareReplay, take } from 'rxjs/operators';
import { of, Observable, BehaviorSubject, ReplaySubject, Subject } from 'rxjs';
import * as apiModel from '../../models/api-request.models';
import esri = __esri; // Esri TypeScript Types
import { MatCheckboxChange } from '@angular/material/checkbox';
import { LooseObject, LayerSettingChangeModel, LayerLabelChangeModel } from '../../models/map-model.model';
import { DomSanitizer } from '@angular/platform-browser';


class LayerInfoTree implements apiModel.LayerInfo {
  [key: string]: any;
  defaultVisibility: boolean;
  id: number;
  maxScale: number;
  minScale: number;
  name: string;
  parentLayerId: number;
  subLayerIds: number[];

  fullUrl?: string;
  subLayerInfos?: apiModel.LayerInfo[];
  isGroupLayer: boolean;
  checked: boolean;
  layerInfo$: Observable<LayerInfoDetail>;
}
interface LayerInfoDetail {
  [key: string]: any;
  showLabel: boolean;
  hasLabels: boolean;
  id: number;
  description: string;
  displayField: string;
  canModifyLayer: boolean;
  legends: apiModel.MapLegendDetail[];
  hasLegends?: boolean;
  geometryType: string;
  name: string;
  type: string;
  drawingInfo: {
    labelingInfo: esri.LabelClass[],
    renderer: esri.Renderer
  };
}

@Component({
  selector: 'map-toc-ui',
  templateUrl: './map-toc-ui.component.html',
  styleUrls: ['./map-toc-ui.component.scss']
})
export class MapTocUIComponent implements OnInit {
  readonly mapUrl$ = new BehaviorSubject<string>(null);
  readonly mapScale$ = new Subject<number>();
  readonly mapInfo$ = this.mapUrl$.pipe(
    filter(e => e != null),
    switchMap(url => this.mapCommonService.getUrljsonInfo(url)),
    // tap(e => {
    //   console.log(e);
    // }),
    shareReplay(1)
  );
  readonly mapLegends$ = this.mapUrl$.pipe(
    filter(e => e != null),
    switchMap(url => this.mapCommonService.getUrljsonInfo(`${url}/legend`).pipe(
      map(e => e.layers as apiModel.MapLegend[]))
    ),
    // tap(e => {
    //   console.log(e);
    // }),
    shareReplay(1)
  );
  readonly layerInfos$ = this.mapInfo$.pipe(
    filter(e => e != null),
    map(e => e.layers as LayerInfoTree[]),
    tap(list => {
      if (list) {
        list.forEach(item => {
          item.fullUrl = `${this.mapUrl$.value}/${item.id}`;
          item.layerInfo$ = this.mapCommonService.getUrljsonInfo(item.fullUrl).pipe(
            switchMap((layerInfo: LayerInfoDetail) => this.mapLegends$.pipe(
              map(mapLegends => {
                if (mapLegends) {
                  const temp = mapLegends.find(e => e.layerId === layerInfo.id);
                  layerInfo.legends = temp && temp.legend;
                  layerInfo.hasLegends = layerInfo.legends && layerInfo.legends.length > 0;
                  layerInfo.showLabel = layerInfo.hasLabels;
                  if (layerInfo.hasLegends) {
                    layerInfo.legends.forEach(l => {
                      l.base64Image = this.domSanitizer.bypassSecurityTrustResourceUrl(`data:${l.contentType};base64, ${l.imageData}`);
                    });
                  }
                }
                return layerInfo;
              }))
            ),
            // tap(e => {
            //   console.log(e.drawingInfo.labelingInfo);
            // }),
            shareReplay(1)
          );
        });
      }
    })
  );
  readonly layerInfosTree$ = this.layerInfos$.pipe(map(list => this.buildTree(list)));

  @Input() set mapScale(input: number) {
    this.mapScale$.next(input);
  }

  @Input() set url(input: string) {
    this.mapUrl$.next(input);
  }
  @Input() isMapLoading: boolean;
  @Output() layerVisibleChange = new EventEmitter<LayerSettingChangeModel>();
  @Output() layerLabelChange = new EventEmitter<LayerLabelChangeModel>();
  constructor(private mapCommonService: MapCommonService, private domSanitizer: DomSanitizer) { }

  ngOnInit(): void {
  }
  onLayerSelectChange(event: MatCheckboxChange, layer: apiModel.LayerInfo, mapInfo: LooseObject) {
    this.layerVisibleChange.emit({
      mapUrl: this.mapUrl$.value,
      visible: event.checked,
      layerid: [layer.id]
    });
  }
  toggleLabel(infoDetail: LayerInfoDetail) {
    infoDetail.showLabel = !infoDetail.showLabel;
    this.layerLabelChange.emit({
      mapUrl: this.mapUrl$.value,
      visible: infoDetail.showLabel,
      layerid: [infoDetail.id]
    });
  }


  private buildTree(list: apiModel.LayerInfo[]): LayerInfoTree[] {
    const result: LayerInfoTree[] = [];
    list.forEach((layerInfo: LayerInfoTree) => {
      layerInfo.isGroupLayer = layerInfo.subLayerIds === null ? false : true;
      layerInfo.checked = layerInfo.defaultVisibility;
      if (layerInfo.parentLayerId === -1) {
        result.push(layerInfo);
      } else {
        list[layerInfo.parentLayerId].subLayerInfos = list[layerInfo.parentLayerId].subLayerInfos || [];
        list[layerInfo.parentLayerId].subLayerInfos.push(layerInfo);
      }
    });
    return result as any;
  }
}
