import { Routes } from '@angular/router';

import { OperationMonitorComponent } from './monitor/operation-monitor.component';
import { MqttMonitorComponent } from './mqtt/mqtt-monitor.component';
import { SystemSettingsComponent } from './settings/system-settings.component';

export const routes: Routes = [
  { path: '', redirectTo: 'monitor', pathMatch: 'full' },
  {
    path: 'monitor',
    component: OperationMonitorComponent,
    data: { title: '运行监控' },
  },
  {
    path: 'mqtt',
    component: MqttMonitorComponent,
    data: { title: 'MQTT监控' },
  },
  {
    path: 'settings',
    component: SystemSettingsComponent,
    data: { title: '系统设置' },
  },
];
