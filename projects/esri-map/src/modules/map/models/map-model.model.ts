import esri = __esri; // Esri TypeScript Types


export interface LooseObject {
    [key: string]: any;
}

export class MapInitModel {
    map: esri.Map;
    mapView: esri.MapView | esri.SceneView;
}

export class LayerSettingChangeModel {
    mapUrl: string;
    layerid: number[];
    visible: boolean;
}
export class LayerLabelChangeModel extends LayerSettingChangeModel {

}
