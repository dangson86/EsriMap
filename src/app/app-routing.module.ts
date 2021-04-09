import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TestMapComponent } from './components/test-map/test-map.component';


const routes: Routes = [
  {
    path: 'map',
    component: TestMapComponent
  },
  {
    path: '',
    redirectTo: 'map',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
