import { Directive, OnInit, Input, ElementRef } from '@angular/core';

@Directive({
    // tslint:disable-next-line: component-selector
    selector: 'map-toc',
})
export class MapTocDirective implements OnInit {
    @Input() url: string;
    @Input() id: string;
    constructor(private el: ElementRef) { }

    ngOnInit(): void {
        this.url = this.url || this.el.nativeElement.innerText;
    }

}
