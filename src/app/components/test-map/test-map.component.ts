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
    { id: 'Earthquakes_Since1970', url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Earthquakes_Since1970/MapServer' },
    { id: 'cencus', url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Census/MapServer' },
    { id: 'sampleCitiesWorld', url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/SampleWorldCities/MapServer' },
    { id: 'wildFire', url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/MapServer' },
    { id: 'Recreation', url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Recreation/FeatureServer' }
  ];
  sceneView = true;
  token: string = null;
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
