import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})
export class TestMapComponent implements OnInit {

  urls = [];

  testMaps = [
    { id: 'test1', url: 'https://epic.ensiteusa.com/arcgis/rest/services/DS/ParcelTestData/MapServer' },
    { id: 'test2', url: 'https://epic.ensiteusa.com/arcgis/rest/services/DS/pipeTallyGpsTest/MapServer' },
    { id: 'test3', url: 'https://epic.ensiteusa.com/arcgis/rest/services/DS/OptiRouteTest/MapServer' },
    { id: 'test4', url: 'https://epic.ensiteusa.com/arcgis/rest/services/DS/LearnOptiRoute2/MapServer' },
    { id: 'test5', url: 'https://epic.ensiteusa.com/arcgis/rest/services/DS/LearnOptiRoute/MapServer' }
  ];

  defaultUrl = this.testMaps[0].url;
  constructor() { }

  ngOnInit(): void {
  }
  onmapLoaded(event) {
    // console.log(event);
  }
  setUrl(input: string) {
    this.defaultUrl = input;
  }
  addMoreMap(testMap) {
    this.urls.push(testMap);
  }
}
