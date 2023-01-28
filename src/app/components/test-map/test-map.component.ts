import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MapViewComponent } from 'ngx-esri-map';

@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})
export class TestMapComponent implements OnInit {
  @ViewChild(MapViewComponent) mapComponent: MapViewComponent;
  urls = [];

  testMaps = [
    { id: 'SantaMonica', url: 'https://services3.arcgis.com/GVgbJbqm8hXASVYi/ArcGIS/rest/services/Santa_Monica_Mountains_Parcels/MapServer' },
    { id: 'cencus', url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer' },
    { id: 'sampleCitiesWorld', url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer' },
    { id: 'wildFire', url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/MapServer' },
    { id: 'Recreation', url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Recreation/FeatureServer' }
  ];
  sceneView = false;
  token: string = '18_CCvn1lnGrxGuiya8ulT9ALYKUe0kTAjWAbTe0qMTproZGyv7LWkAiJH3bueCy';
  defaultUrl = this.testMaps[0].url;
  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
  }
  onmapLoaded(event) {
    // console.log(event);
  }
  setUrl(input: string) {
    this.defaultUrl = input;
  }
  addMoreMap(testMap) {
    if (testMap) {
      if (testMap instanceof Object) {
        this.urls.push(testMap);
      } else {
        this.urls.push({
          id: `test ${this.urls.length}`,
          url: testMap
        });
      }
    }

  }
  onMapChange(event) {
  }
}
