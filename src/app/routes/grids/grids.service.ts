import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageQuery, PageResult } from '@shared/types/page';
import { Grid, SaveGridPayload } from '@shared/types/rain-grid';
import { Observable } from 'rxjs';

export interface GridQuery extends PageQuery {
  name?: string;
  sncode?: string;
  resolution?: string;
}

@Injectable({ providedIn: 'root' })
export class GridsService {
  private readonly http = inject(HttpClient);

  list(query: GridQuery = {}): Observable<PageResult<Grid>> {
    return this.http.get<PageResult<Grid>>('/grid/list', {
      params: this.toParams(query),
    });
  }

  query(query: GridQuery = {}): Observable<Grid[]> {
    return this.http.get<Grid[]>('/grid/query', {
      params: this.toParams(query),
    });
  }

  get(guid: string): Observable<Grid> {
    return this.http.get<Grid>(`/grid/${guid}`);
  }

  save(payload: SaveGridPayload, guid?: string): Observable<boolean> {
    if (guid) {
      return this.http.put<boolean>(`/grid/${guid}`, payload);
    }
    return this.http.post<boolean>('/grid', payload);
  }

  delete(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/grid/${guid}`);
  }

  private toParams(query: GridQuery): HttpParams {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params = params.set(key, String(value));
    });
    return params;
  }
}
