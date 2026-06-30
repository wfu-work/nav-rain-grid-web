import { Routes } from '@angular/router';
import { startPageGuard } from '@core';

import { LayoutBasic } from '../layout';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutBasic,
    canActivate: [startPageGuard],
    data: { title: '降雨格网系统' },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, data: { title: '工作台' } },
      {
        path: 'devices',
        loadChildren: () => import('./devices/routes').then((m) => m.routes),
        data: { title: '设备管理' },
      },
      {
        path: 'grids',
        loadChildren: () => import('./grids/routes').then((m) => m.routes),
        data: { title: '格网管理' },
      },
      {
        path: 'rainfall',
        loadChildren: () => import('./rainfall/routes').then((m) => m.routes),
        data: { title: '降雨数据' },
      },
      {
        path: 'system',
        loadChildren: () => import('./system/routes').then((m) => m.routes),
        data: { title: '系统设置' },
      },
    ],
  },
  { path: '', loadChildren: () => import('./passport/routes').then((m) => m.routes) },
  {
    path: 'exception',
    loadChildren: () => import('./exception/routes').then((m) => m.routes),
    data: { title: '异常页' },
  },
  { path: '**', redirectTo: 'exception/404' },
];
