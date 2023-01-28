import esri = __esri; // Esri TypeScript Types


export interface LooseObject {
    [key: string]: any;
}

export class MapInitModel {
    map: esri.Map;
    mapView: esri.MapView | esri.SceneView;
    events: {
        click?: esri.Handle;
    } = {};
    mapTools: {
        draw?: esri.Draw;
    } = {};
}

export class LayerSettingChangeModel {
    [key: string]: any;
    mapUrl: string;
    layerid: number[];
    visible: boolean;
}
export class LayerLabelChangeModel extends LayerSettingChangeModel {

}
export interface ExecuteIdentifyTaskResult {
    url: string;
    layerIds: number[];
    layerResults: {
        layerId: number;
        layerName: string;
        IdentifyResult: esri.IdentifyResult[];
    }[];
}

export interface IServiceToken {
    ssl: boolean;
    token: string;
    server: string;
}