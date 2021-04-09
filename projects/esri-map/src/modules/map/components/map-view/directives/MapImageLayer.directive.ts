import { OnInit, Input, Directive, ElementRef, OnDestroy } from '@angular/core';
import { MapCommonService } from '../../../services/map-common.service';
import { Subject, combineLatest, ReplaySubject, of } from 'rxjs';
import { MapViewComponent } from '../map-view.component';
import { tap, takeUntil, switchMap, map, catchError } from 'rxjs/operators';
import { MapInitModel } from '../../../models/map-model.model';

@Directive({
    // tslint:disable-next-line: component-selector
    // tslint:disable-next-line: directive-selector
    selector: 'map-image-layer',
})
export class MapImageLayerDirective implements OnInit, OnDestroy {
    private mapLayer: __esri.MapImageLayer;
    @Input() set url(input: string) {
        this.inputUrl.next(input);
    }
    @Input() set id(input: string) {
        this.inputId.next(input);
    }
    @Input() zoomToOnAdd = true;

    readonly inputUrl = new ReplaySubject<string>(1);
    readonly inputId = new ReplaySubject<string>(1);
    readonly mapLoad$ = this.host.initMap$.pipe(
        tap(e => {
            this.mapModel = e;
        })
    );
    mapModel: MapInitModel;

    readonly initLayer$ = this.mapLoad$.pipe(
        switchMap(mapModel => combineLatest([this.inputId, this.inputUrl]).pipe(
            switchMap(([id, url]) => {
                if (id && url) {
                    return this.host.addLayer(id, url).pipe(
                        tap(e => {
                            this.mapLayer = e.layer as __esri.MapImageLayer;
                        }),
                        switchMap(view => this.zoomToOnAdd ? this.host.zoomToExtent(view.layer.fullExtent).pipe(map(e => view)) : of(null)),
                        catchError(error => {
                            console.error(error);
                            return of(null);
                        }),
                    );
                }
                return of(null);
            })
        ))
    );
    private readonly isDestroyed$ = new Subject();
    constructor(private el: ElementRef, private mapCommonService: MapCommonService, private host: MapViewComponent) {

    }

    ngOnInit(): void {
        this.initLayer$.pipe(
            takeUntil(this.isDestroyed$)
        ).subscribe();
    }

    ngOnDestroy(): void {
        this.isDestroyed$.next();
        this.isDestroyed$.complete();
        if (this.mapLayer) {
            this.host.removeLayer(this.mapLayer.id, this.mapLayer.url);
        }
    }
}
