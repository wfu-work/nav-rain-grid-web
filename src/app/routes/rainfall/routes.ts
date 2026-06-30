import { Routes } from '@angular/router';

import { PredictListComponent } from './predict/predict-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'predict', pathMatch: 'full' },
  {
    path: 'predict',
    component: PredictListComponent,
    data: { title: '预测数据' },
  },
];
