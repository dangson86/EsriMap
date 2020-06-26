import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapCommonService } from './services/map-common.service';
import { MapViewComponent } from './components/map-view/map-view.component';
import { MapUrlDirective } from './components/map-view/directives/map-url.directive';
import { MapTocDirective } from './components/map-view/directives/map-toc.directive';
import { MapTocUIComponent } from './components/map-toc-ui/map-toc-ui.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CommonDirectiveModule } from '../share/common-directive.module';
import { MatTabsModule } from '@angular/material/tabs';



@NgModule({
  declarations: [
    MapViewComponent,
    MapUrlDirective,
    MapTocDirective,
    MapTocUIComponent
  ],
  imports: [
    CommonModule,
    CommonDirectiveModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    FormsModule,
    MatExpansionModule,
    MatButtonToggleModule,
    MatTabsModule
  ],
  providers: [
    MapCommonService
  ],
  exports: [
    MapViewComponent,
    MapUrlDirective,
    MapTocDirective,
    FormsModule
  ]
})
export class EsriMapModule { }
