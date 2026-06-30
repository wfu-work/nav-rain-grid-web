import { Routes } from '@angular/router';

import { DeviceDistributionComponent } from './distribution/device-distribution.component';
import { DeviceEditComponent } from './edit/device-edit.component';
import { DeviceListComponent } from './list/device-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: DeviceListComponent,
    data: { title: '设备列表' },
  },
  {
    path: 'distribution',
    component: DeviceDistributionComponent,
    data: { title: '设备分布' },
  },
  {
    path: 'create',
    component: DeviceEditComponent,
    data: { title: '新建设备' },
  },
  {
    path: 'edit/:guid',
    component: DeviceEditComponent,
    data: { title: '编辑设备' },
  },
];
