import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})
export class TestMapComponent implements OnInit {
  url = 'https://epic.ensiteusa.com/arcgis/rest/services/DS/LearnOptiRoute/MapServer';
  constructor() { }

  ngOnInit(): void {
  }
  onmapLoaded(event) {
    // console.log(event);
  }
  setUrl(input: string) {
    this.url = input;
  }
}
