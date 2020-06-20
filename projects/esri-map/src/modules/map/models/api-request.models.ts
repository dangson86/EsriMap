import { LooseObject } from './map-model.model';
import { SafeResourceUrl } from '@angular/platform-browser';

export interface LayerInfo extends LooseObject {
    defaultVisibility: boolean;
    id: number;
    maxScale: number;
    minScale: number;
    name: string;
    parentLayerId: number;
    subLayerIds: number[];
}
export interface MapLegend {
    layerId: number;
    layerName: string;
    layerType: string;
    legend: MapLegendDetail[];
    maxScale: number;
    minScale: number;
}

export interface MapLegendDetail {
    base64Image: SafeResourceUrl;
    contentType: string;
    height: number;
    imageData: string;
    label: string;
    url: string;
    width: number;
    values: string[];
}
