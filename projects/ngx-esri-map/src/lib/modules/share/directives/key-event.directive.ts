import { Directive, Input, OnInit, ViewContainerRef, ElementRef, Output, EventEmitter, HostListener, OnDestroy } from '@angular/core';
import { fromEvent, Observable, interval, Subject } from 'rxjs';
import { tap, takeUntil, repeat, take, distinctUntilChanged, filter, switchMap, finalize } from 'rxjs/operators';

@Directive({
    // tslint:disable-next-line: directive-selector
    selector: '[keyevent]',
    exportAs: 'keyEventDirective'
})
export class KeyEventDirective implements OnInit, OnDestroy {
    @Input() keys: string[];
    selectedKey: string;
    isPress = false;
    @Output() readonly keyDown = new EventEmitter<any>();
    @Output() readonly keyUp = new EventEmitter<any>();
    private readonly keyDownEvent$: Observable<KeyboardEvent>;
    private readonly keyUpEvent$: Observable<KeyboardEvent>;

    private keyPressEvent$: Observable<any>;
    private isDestroy$ = new Subject<void>();
    constructor(private elementRef: ElementRef) {
        this.keyDownEvent$ = fromEvent<KeyboardEvent>(this.elementRef.nativeElement, 'keydown').pipe(
            tap(e => {
                this.keyDown.emit(e);
            })
        );
        this.keyUpEvent$ = fromEvent<KeyboardEvent>(this.elementRef.nativeElement, 'keyup').pipe(
            tap(e => {
                this.keyUp.emit(e);
            })
        );
        this.keyPressEvent$ = this.keyDownEvent$.pipe(
            filter(e => this.keys.indexOf(e.key) !== -1),
            distinctUntilChanged((prev, curr) => prev.key === curr.key),
            tap(e => {
                this.isPress = true;
                this.selectedKey = e.key;
                e.preventDefault();
            }),
            takeUntil(this.keyUpEvent$),
            finalize(() => {
                this.isPress = false;
            }),
            repeat()
        );
    }
    ngOnDestroy(): void {
        this.isDestroy$.next();
    }
    ngOnInit(): void {
        this.keyPressEvent$.pipe(
            // tap(e => {
            //     console.log(e);
            // }),
            takeUntil(this.isDestroy$)
        ).subscribe();
    }

}
