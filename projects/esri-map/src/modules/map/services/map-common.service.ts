import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { mergeMap, switchMap, map, shareReplay, finalize } from 'rxjs/operators';
import { loadModules, loadScript, loadCss } from 'esri-loader';
import esri = __esri; // Esri TypeScript Types
import { LooseObject, ExecuteIdentifyTaskResult } from '../models/map-model.model';

@Injectable()
export class MapCommonService {

    private GEOMETRY_SERVICE_URL = 'https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer';
    private readonly version = '4.18';
    readonly loadEsriBaseScript$ = from(loadScript({
        url: `https://js.arcgis.com/${this.version}/`
    }).then(e => {
        loadCss(`https://js.arcgis.com/${this.version}/esri/themes/light/main.css`);
    })).pipe(
        shareReplay(1)
    );

    getUrljsonInfo(url: string) {
        return this.esriRequest(url, { query: { f: 'json' }, responseType: 'json' }).pipe(
            map(e => e.data),
        );
    }

    getSublayersInfo(mapUrl: string) {
        return this.loadModules('esri/layers/MapImageLayer').pipe(
            switchMap(([MapImageLayer]) => {
                const newImagelayer: esri.MapImageLayer = new MapImageLayer({
                    url: mapUrl
                });
                return from(newImagelayer.loadAll()).pipe(
                    map(mapLayer => {
                        return mapLayer.sublayers.toArray();
                    })
                );
            })
        );
    }

    executeIdentifyTask(url: string, viewWidth: number, viewHeight: number, layerIds: number[], mapExtent: esri.Extent, geometry: esri.Geometry, tolerance = 3, returnGeometry = false): Observable<ExecuteIdentifyTaskResult> {
        return this.loadModules('esri/tasks/IdentifyTask', 'esri/tasks/support/IdentifyParameters').pipe(
            switchMap(([IdentifyTask, IdentifyParameters]) => {
                const identifyTask: esri.IdentifyTask = new IdentifyTask(url);
                const params: esri.IdentifyParameters = new IdentifyParameters();
                params.tolerance = tolerance;
                params.width = viewWidth;
                params.height = viewHeight;
                params.layerIds = layerIds;
                params.returnGeometry = returnGeometry;
                params.mapExtent = mapExtent;
                params.geometry = geometry;
                params.layerOption = 'visible';
                return from(identifyTask.execute(params)).pipe(
                    map(e => {
                        const results = e.results as esri.IdentifyResult[];
                        const groupByResult: { [key: string]: esri.IdentifyResult[] } = results.reduce((acc, curr) => (acc[curr.layerId] = [...acc[curr.layerId] || [], curr]) && acc, {});
                        const layerResults = [];
                        for (const key in groupByResult) {
                            if (Object.prototype.hasOwnProperty.call(groupByResult, key)) {
                                const items = groupByResult[key];
                                layerResults.push({
                                    layerId: Number.parseInt(key),
                                    layerName: items[0].layerName,
                                    IdentifyResult: items
                                });
                            }
                        }
                        return {
                            url,
                            layerIds,
                            layerResults
                        };
                    }),
                );
            })
        );
    }
    esriRequest(url: string, option?: esri.RequestOptions): Observable<esri.RequestResponse> {
        return this.loadModules('esri/request').pipe(
            switchMap(([request]) => {
                return from(request(url, option));
            })
        );
    }
    loadModules(...moduleNames: string[]): Observable<any[]> {
        return from(loadModules(moduleNames));
    }
    createExtent(fullExtent: { xmin: number, ymin: number, xmax: number, ymax: number, spatialReference: any })
        : Observable<esri.Extent> {
        return this.loadModules('esri/geometry/Extent').pipe(switchMap(([Extent]) => {

            const newExtent = new Extent(fullExtent);
            console.log(fullExtent, newExtent);
            return of(newExtent);
        }));
    }


    createGraphicLayer(id: string): Observable<esri.GraphicsLayer> {
        return this.loadModules('esri/layers/GraphicsLayer').pipe(
            switchMap(([GraphicsLayer]) => {
                const layer: esri.GraphicsLayer = new GraphicsLayer({
                    id
                });
                return of(layer);
            })
        );
    }


    createGraphic(inputGeo: esri.Geometry, symbol: LooseObject, attrs: any = null): Observable<esri.Graphic> {
        return this.loadModules('esri/Graphic').pipe(switchMap(([Graphic]) => {
            const graphic: esri.Graphic = new Graphic({
                geometry: inputGeo,
                symbol,
                attributes: attrs
            });
            return of(graphic);
        }));
    }
    createSpatialReferenceFromWKT(wkt: string): Observable<esri.SpatialReference> {
        return this.loadModules('esri/geometry/SpatialReference').pipe(switchMap(([SpatialReference]) => {
            const temp = new SpatialReference({ wkt });
            return of(temp);
        }));
    }
    projectGeometry(geometries: esri.Geometry[], outSpatialReference: esri.SpatialReference): Observable<esri.Geometry[]> {
        return this.loadModules('esri/geometry/projection').pipe(
            switchMap(([projection]) => from(projection.load()).pipe(
                map(e => {
                    return geometries.map(geo => projection.project(geo, outSpatialReference));
                })
            ))
        );
    }
}
