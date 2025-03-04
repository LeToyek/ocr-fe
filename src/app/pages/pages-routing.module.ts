import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Component pages
import { DashboardComponent } from "./dashboards/dashboard/dashboard.component";
import { CameraComponent } from './dashboards/camera/camera.component';

const routes: Routes = [
    {
        path: "",
        component: DashboardComponent
    },
    {
      path: 'camera',
      component: CameraComponent
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
