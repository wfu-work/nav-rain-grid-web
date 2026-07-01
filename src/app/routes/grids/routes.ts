import { Routes } from '@angular/router';

import { GridEditComponent } from './edit/grid-edit.component';
import { GridDataListComponent } from './data/grid-data-list.component';
import { GridGraphicComponent } from './graphic/grid-graphic.component';
import { GridListComponent } from './list/grid-list.component';
import { GridTaskListComponent } from './tasks/grid-task-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: GridListComponent,
    data: { title: '格网列表' },
  },
  {
    path: 'tasks',
    component: GridTaskListComponent,
    data: { title: '格网任务' },
  },
  {
    path: 'data',
    component: GridDataListComponent,
    data: { title: '格网数据' },
  },
  {
    path: 'graphic',
    component: GridGraphicComponent,
    data: { title: '格网图形' },
  },
  {
    path: 'create',
    component: GridEditComponent,
    data: { title: '新建格网' },
  },
  {
    path: 'edit/:guid',
    component: GridEditComponent,
    data: { title: '编辑格网' },
  },
];
