import { Component, OnInit, Input, Directive, ContentChild, AfterContentInit, ElementRef, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  // tslint:disable-next-line: component-selector
  selector: 'map-url',
})
export class MapUrlDirective implements OnInit, OnChanges {
  @Input() url: string;
  @Input() id: string;
  @Input() toc = false;

  @Output() readonly urlChange = new EventEmitter<MapUrlDirective>();
  constructor(private el: ElementRef) { }


  ngOnInit(): void {
    this.url = this.url || this.el.nativeElement.innerText;
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.url) {
      this.urlChange.emit(this);
    }
  }
}
