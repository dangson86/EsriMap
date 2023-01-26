import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MapViewComponent } from 'esri-map';

@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})
export class TestMapComponent implements OnInit {
  @ViewChild(MapViewComponent) mapComponent: MapViewComponent;
  urls = [];

  testMaps = [
    { id: 'test1', url: 'https://epic.ensiteusa.com/arcgis/rest/services/DS/DemoClient_Dalas_oil/MapServer' },
    { id: 'test2', url: 'https://epic.ensiteusa.com/arcgis/rest/services/DS/EngineeringMarkup/MapServer' },
    { id: 'test3', url: 'https://epic.ensiteusa.com/arcgis/rest/services/DS/LearnOptiRoute2/MapServer' },
    { id: 'test4', url: 'https://epic.ensiteusa.com/arcgis/rest/services/DS/LearnOptiRoute/MapServer' },
    { id: 'test5', url: 'https://epic.ensiteusa.com/arcgis/rest/services/DS/pipeTallyGpsTest/MapServer' }
  ];
  sceneView = false;
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
      this.urls.push({
        id: `test ${this.urls.length}`,
        url: testMap
      });
    }

  }
  onMapChange(event) {
  }
}
