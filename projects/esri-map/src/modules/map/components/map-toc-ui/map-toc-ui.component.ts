import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { MapCommonService } from '../../services/map-common.service';
import { switchMap, map, tap, filter, shareReplay, take } from 'rxjs/operators';
import { of, Observable, BehaviorSubject } from 'rxjs';
import * as apiModel from '../../models/api-request.models';
import esri = __esri; // Esri TypeScript Types
import { MatCheckboxChange } from '@angular/material/checkbox';
import { LooseObject, LayerSettingChangeModel } from '../../models/map-model.model';
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
  legends: apiModel.MapLegendDetail[];
  hasLegends?: boolean;
}

@Component({
  selector: 'map-toc-ui',
  templateUrl: './map-toc-ui.component.html',
  styleUrls: ['./map-toc-ui.component.scss']
})
export class MapTocUIComponent implements OnInit {


  readonly mapUrl$ = new BehaviorSubject<string>(null);
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
            switchMap((layerInfo: LayerInfoDetail) => this.mapLegends$.pipe(map(mapLegends => {
              if (mapLegends) {
                const temp = mapLegends.find(e => e.layerId === layerInfo.id);
                layerInfo.legends = temp && temp.legend;
                layerInfo.hasLegends = layerInfo.legends && layerInfo.legends.length > 0;
                if (layerInfo.hasLegends) {
                  layerInfo.legends.forEach(l => {
                    l.base64Image = this.domSanitizer.bypassSecurityTrustResourceUrl(`data:${l.contentType};base64, ${l.imageData}`);
                  });
                }
              }
              return layerInfo;
            }))),
            // tap(e => {
            //   console.log(e);
            // }),
            shareReplay(1)
          );
        });
      }
    })
  );
  readonly layerInfosTree$ = this.layerInfos$.pipe(map(list => this.buildTree(list)));
  @Input() set url(input: string) {

    this.mapUrl$.next(input);
  }
  @Output() layerSettingChange = new EventEmitter<LayerSettingChangeModel>();
  constructor(private mapCommonService: MapCommonService, private domSanitizer: DomSanitizer) { }

  ngOnInit(): void {
  }
  onLayerSelectChange(event: MatCheckboxChange, layer: apiModel.LayerInfo, mapInfo: LooseObject) {
    this.layerSettingChange.emit({
      mapUrl: this.mapUrl$.value,
      visible: event.checked,
      layerid: [layer.id]
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
