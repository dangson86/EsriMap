import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyEventDirective } from './directives/key-event.directive';




@NgModule({
    declarations: [
        KeyEventDirective,
    ],
    imports: [
        CommonModule,

    ],
    providers: [
    ],
    exports: [
        KeyEventDirective
    ]
})
export class CommonDirectiveModule { }
