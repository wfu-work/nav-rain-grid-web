import { Routes } from '@angular/router';

import { GridEditComponent } from './edit/grid-edit.component';
import { GridListComponent } from './list/grid-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: GridListComponent,
    data: { title: '格网列表' },
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
