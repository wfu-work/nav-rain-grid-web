import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageQuery, PageResult } from '@shared/types/page';
import { PredictGroup } from '@shared/types/rain-grid';
import { Observable } from 'rxjs';

export interface PredictQuery extends PageQuery {
  sncode?: string;
  startTime?: number | string;
  endTime?: number | string;
}

@Injectable({ providedIn: 'root' })
export class RainfallService {
  private readonly http = inject(HttpClient);

  predictList(query: PredictQuery = {}): Observable<PageResult<PredictGroup>> {
    return this.http.get<PageResult<PredictGroup>>('/predict/list', {
      params: this.toParams(query),
    });
  }

  private toParams(query: PredictQuery): HttpParams {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params = params.set(key, String(value));
    });
    return params;
  }
}
