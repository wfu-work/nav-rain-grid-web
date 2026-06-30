import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { RainGridSettings, SystemConfig } from '@shared/types/rain-grid';
import { Observable, map } from 'rxjs';

export const RAIN_GRID_SETTINGS_KEY = 'rain-grid-settings';

export const DEFAULT_RAIN_GRID_SETTINGS: RainGridSettings = {
  mqttEnable: true,
  mqttPort: 1883,
  heartbeatTimeoutMinutes: 10,
  gridCron: '0 * * * *',
  excelOutputDir: 'exports/rain-grid',
};

@Injectable({ providedIn: 'root' })
export class SystemSettingsService {
  private readonly http = inject(HttpClient);

  getConfig(): Observable<SystemConfig | null> {
    return this.http.get<SystemConfig | null>('/configs');
  }

  getSettings(): Observable<RainGridSettings> {
    return this.getConfig().pipe(map((config) => this.parseSettings(config)));
  }

  saveSettings(payload: RainGridSettings): Observable<boolean> {
    return this.http.post<boolean>('/configs', {
      key: RAIN_GRID_SETTINGS_KEY,
      value: JSON.stringify(payload),
    });
  }

  private parseSettings(config: SystemConfig | null): RainGridSettings {
    if (!config?.value) return { ...DEFAULT_RAIN_GRID_SETTINGS };
    try {
      const value = JSON.parse(config.value) as Partial<RainGridSettings>;
      return {
        ...DEFAULT_RAIN_GRID_SETTINGS,
        ...value,
      };
    } catch {
      return { ...DEFAULT_RAIN_GRID_SETTINGS };
    }
  }
}
