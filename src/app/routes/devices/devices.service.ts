import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageQuery, PageResult } from '@shared/types/page';
import { Device, SaveDevicePayload } from '@shared/types/rain-grid';
import { Observable } from 'rxjs';

export interface DeviceQuery extends PageQuery {
  sncode?: string;
  alias?: string;
  type?: string;
  gsw?: boolean | string;
  rain?: boolean | string;
}

@Injectable({ providedIn: 'root' })
export class DevicesService {
  private readonly http = inject(HttpClient);

  list(query: DeviceQuery = {}): Observable<PageResult<Device>> {
    return this.http.get<PageResult<Device>>('/device/list', {
      params: this.toParams(query),
    });
  }

  listAll(query: DeviceQuery = {}): Observable<Device[]> {
    return this.http.get<Device[]>('/device/list/all', {
      params: this.toParams(query),
    });
  }

  query(query: DeviceQuery = {}): Observable<Device[]> {
    return this.http.get<Device[]>('/device/query', {
      params: this.toParams(query),
    });
  }

  get(guid: string): Observable<Device> {
    return this.http.get<Device>(`/device/${guid}`);
  }

  getBySncode(sncode: string): Observable<Device> {
    return this.http.get<Device>(`/device/sncode/${sncode}`);
  }

  save(payload: SaveDevicePayload, guid?: string): Observable<boolean> {
    if (guid) {
      return this.http.put<boolean>(`/device/${guid}`, payload);
    }
    return this.http.post<boolean>('/device', payload);
  }

  delete(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/device/${guid}`);
  }

  private toParams(query: DeviceQuery): HttpParams {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params = params.set(key, String(value));
    });
    return params;
  }
}
