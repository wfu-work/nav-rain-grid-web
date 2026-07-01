import { Routes } from '@angular/router';

import { PredictChartComponent } from './chart/predict-chart.component';
import { PredictListComponent } from './predict/predict-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'predict', pathMatch: 'full' },
  {
    path: 'chart',
    component: PredictChartComponent,
    data: { title: '降雨图表' },
  },
  {
    path: 'predict',
    component: PredictListComponent,
    data: { title: '预测数据' },
  },
];
