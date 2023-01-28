import { Injectable } from '@angular/core';
import Extent from "@arcgis/core/geometry/Extent";
import Geometry from "@arcgis/core/geometry/Geometry";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";

import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import esriRequest from "@arcgis/core/request";
import IdentifyParameters from '@arcgis/core/rest/support/IdentifyParameters';
import IdentifyResult from '@arcgis/core/rest/support/IdentifyResult';
import { Observable, from, of, map, shareReplay } from 'rxjs';
import { LooseObject, ExecuteIdentifyTaskResult, IServiceToken } from '../models/map-model.model';
import * as projection from "@arcgis/core/geometry/projection";
import * as identify from "@arcgis/core/rest/identify";
import esriId from "@arcgis/core/identity/IdentityManager";

import { loadCss } from 'esri-loader';


@Injectable()
export class MapCommonService {

    private readonly GEOMETRY_SERVICE_URL = 'https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer';
    private readonly version = "4.25";
    get cssCdn() {
        return `https://js.arcgis.com/${this.version}/@arcgis/core/assets/esri/themes/light/main.css`;
    }

    readonly loadEsriBaseScript$ = of(loadCss(this.cssCdn)).pipe(
        shareReplay(1)
    );


    constructor() {
    }

    registerAuthToken(token: IServiceToken, destroyCredentials = true) {
        if (destroyCredentials) {
            esriId.destroyCredentials();
        }

        esriId.registerToken(token);
    }
    getUrljsonInfo(url: string) {
        return this.esriRequest(url, { query: { f: 'json' }, responseType: 'json' }).pipe(
            map(e => e.data),
        );
    }

    getSublayersInfo(mapUrl: string) {
        const newImagelayer: MapImageLayer = new MapImageLayer({
            url: mapUrl
        });
        return from(newImagelayer.loadAll()).pipe(
            map((mapLayer: any) => {
                return mapLayer.sublayers.toArray();
            })
        );
    }

    executeIdentifyTask(url: string, viewWidth: number, viewHeight: number, layerIds: number[], mapExtent: Extent, geometry: Geometry, tolerance = 3, returnGeometry = false): Observable<ExecuteIdentifyTaskResult> {
        const params: IdentifyParameters = new IdentifyParameters();
        params.tolerance = tolerance;
        params.width = viewWidth;
        params.height = viewHeight;
        params.layerIds = layerIds;
        params.returnGeometry = returnGeometry;
        params.mapExtent = mapExtent;
        params.geometry = geometry;
        params.layerOption = 'visible';

        return from(identify.identify(url, params)).pipe(
            map((e: any) => {
                const results = e.results as IdentifyResult[];
                const groupByResult: { [key: string]: IdentifyResult[] } = results.reduce((acc, curr) => (acc[curr.layerId] = [...acc[curr.layerId] || [], curr]) && acc, {});
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
    }
    esriRequest(url: string, option?: __esri.RequestOptions): Observable<__esri.RequestResponse> {
        return from(esriRequest(url, option));
    }

    createExtent(fullExtent: { xmin: number, ymin: number, xmax: number, ymax: number, spatialReference: any }): Observable<Extent> {
        const newExtent = new Extent(fullExtent);
        console.log(fullExtent, newExtent);
        return of(newExtent);
    }


    createGraphicLayer(id: string): Observable<GraphicsLayer> {
        const layer: GraphicsLayer = new GraphicsLayer({
            id
        });
        return of(layer);
    }


    createGraphic(inputGeo: Geometry, symbol: LooseObject, attrs: any = null): Observable<Graphic> {
        const graphic: Graphic = new Graphic({
            geometry: inputGeo,
            symbol,
            attributes: attrs
        });
        return of(graphic);
    }
    createSpatialReferenceFromWKT(wkt: string): Observable<SpatialReference> {
        const temp = new SpatialReference({ wkt });
        return of(temp);
    }
    projectGeometry(geometries: Geometry[], outSpatialReference: SpatialReference) {
        return from(projection.load()).pipe(
            map(e => {
                return projection.project(geometries, outSpatialReference)
            })
        )
    }
}
