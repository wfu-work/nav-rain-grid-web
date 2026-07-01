import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageQuery, PageResult } from '@shared/types/page';
import { Grid, GridDiffPoint, GridDiffTask, SaveGridPayload } from '@shared/types/rain-grid';
import { Observable } from 'rxjs';

export interface GridQuery extends PageQuery {
  name?: string;
  sncode?: string;
  resolution?: string;
}

export interface GridDiffTaskQuery extends PageQuery {
  gridGuid?: string;
  gridName?: string;
  baseTime?: number | string;
}

export interface GridDiffPointQuery extends PageQuery {
  taskGuid?: string;
  gridGuid?: string;
  gridName?: string;
  baseTime?: number | string;
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

  taskList(query: GridDiffTaskQuery = {}): Observable<PageResult<GridDiffTask>> {
    return this.http.get<PageResult<GridDiffTask>>('/grid-diff-task/list', {
      params: this.toParams(query),
    });
  }

  taskQuery(query: GridDiffTaskQuery = {}): Observable<GridDiffTask[]> {
    return this.http.get<GridDiffTask[]>('/grid-diff-task/query', {
      params: this.toParams(query),
    });
  }

  pointList(query: GridDiffPointQuery = {}): Observable<PageResult<GridDiffPoint>> {
    return this.http.get<PageResult<GridDiffPoint>>('/grid-diff-point/list', {
      params: this.toParams(query),
    });
  }

  pointQuery(query: GridDiffPointQuery = {}): Observable<GridDiffPoint[]> {
    return this.http.get<GridDiffPoint[]>('/grid-diff-point/query', {
      params: this.toParams(query),
    });
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
