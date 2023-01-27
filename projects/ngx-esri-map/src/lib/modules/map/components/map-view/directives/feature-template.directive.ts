import { Directive, OnDestroy, OnInit, Output, EventEmitter } from '@angular/core';
import { MapCommonService } from '../../../services/map-common.service';
import { MapViewComponent } from '../map-view.component';


@Directive({
    selector: '[featureTemplate]'
})
export class FeatureTemplateDirective implements OnInit, OnDestroy {

    constructor(private mapViewComp: MapViewComponent, private mapCommonService: MapCommonService) { }
    ngOnDestroy(): void {
    }
    ngOnInit(): void {
        console.log("I am (FeatureTemplateDirective) live");
    }

}
