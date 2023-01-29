import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapCommonService } from './services/map-common.service';
import { MapViewComponent } from './components/map-view/map-view.component';
import { MapUrlDirective } from './components/map-view/directives/map-url.directive';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MapSketchDirective } from './components/map-view/directives/map-sketch.directive';
import { FeatureTemplateDirective } from './components/map-view/directives/feature-template.directive';
import { BaseMapGalleryComponent } from './components/base-map-gallery/base-map-gallery.component';
import { MatMenuModule } from '@angular/material/menu';


@NgModule({
  declarations: [
    MapViewComponent,
    MapUrlDirective,
    MapTocUIComponent,
    MapSketchDirective,
    FeatureTemplateDirective,
    BaseMapGalleryComponent
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
    MatTabsModule,
    MatProgressSpinnerModule,
    MatMenuModule
  ],
  providers: [
    MapCommonService
  ],
  exports: [
    MapViewComponent,
    MapUrlDirective,
    FeatureTemplateDirective,
    FormsModule
  ]
})
export class EsriMapModule { }
