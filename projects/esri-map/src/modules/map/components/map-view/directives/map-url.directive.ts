import { Component, OnInit, Input, Directive, ContentChild, AfterContentInit, ElementRef, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { combineLatest, of, ReplaySubject, Subject } from 'rxjs';
import { catchError, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { MapInitModel } from '../../../models/map-model.model';
import { MapCommonService } from '../../../services/map-common.service';
import { MapViewComponent } from '../map-view.component';

@Directive({
  selector: 'map-url',
})
export class MapUrlDirective implements OnInit, OnChanges {
  @Input() toc = true;

  @Output() readonly urlChange = new EventEmitter<MapUrlDirective>();

  private mapLayer: __esri.MapImageLayer;
  private _url = null;
  @Input() set url(input: string) {
    this.inputUrl.next(input);
    this._url = input;
  }
  get url() {
    return this._url;
  }

  private _id = null;
  @Input() set id(input: string) {
    this.inputId.next(input);
    this._id = input;
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
  private readonly isDestroyed$ = new Subject<void>();

  constructor(private el: ElementRef, private mapCommonService: MapCommonService, private host: MapViewComponent) {
  }

  ngOnInit(): void {
    if (this.el.nativeElement.innerText && !this._url) {
      this.url = this.el.nativeElement.innerText;
    }


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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.url) {
      this.urlChange.emit(this);
    }
  }
}
