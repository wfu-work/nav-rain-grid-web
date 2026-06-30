import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MqttMonitorInfo, SystemMonitorInfo } from '@shared/types/rain-grid';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SystemMonitorService {
  private readonly http = inject(HttpClient);

  runtime(): Observable<SystemMonitorInfo> {
    return this.http.get<SystemMonitorInfo>('/system/monitor/runtime');
  }

  mqtt(): Observable<MqttMonitorInfo> {
    return this.http.get<MqttMonitorInfo>('/system/monitor/mqtt');
  }
}
