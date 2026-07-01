import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { STChange, STColumn } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { GridDiffPoint } from '@shared/types/rain-grid';
import { finalize } from 'rxjs';

import { GridsService } from '../grids.service';

@Component({
  selector: 'app-grid-data-list',
  templateUrl: './grid-data-list.component.html',
  styleUrls: ['./grid-data-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class GridDataListComponent implements OnInit {
  private readonly service = inject(GridsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly q = {
    page: 1,
    size: 10,
    content: '',
    taskGuid: '',
  };

  protected data: GridDiffPoint[] = [];
  protected total = 0;
  protected loading = false;

  protected readonly columns: Array<STColumn<GridDiffPoint>> = [
    { title: '格网', index: 'gridName', render: 'gridRender', width: 210 },
    { title: '中心点', render: 'centerRender', width: 170 },
    { title: '基准时间', index: 'baseTime', render: 'baseTimeRender', width: 160 },
    { title: '1小时', render: 'rain1hRender', width: 130 },
    { title: '12小时', render: 'rain12hRender', width: 130 },
    { title: '24小时', render: 'rain24hRender', width: 130 },
    { title: '更新时间', index: 'updateTime', render: 'timeRender', width: 160 },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    this.service
      .pointList(this.q)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((res) => {
        this.data = res.data ?? [];
        this.total = res.total ?? 0;
        this.q.page = res.page || this.q.page;
        this.q.size = res.size || this.q.size;
      });
  }

  protected search(): void {
    this.q.page = 1;
    this.getData();
  }

  protected resetQuery(): void {
    this.q.page = 1;
    this.q.content = '';
    this.q.taskGuid = '';
    this.getData();
  }

  protected tableChange(event: STChange): void {
    switch (event.type) {
      case 'pi':
      case 'ps':
      case 'filter':
      case 'sort':
        this.q.page = event.pi;
        this.q.size = event.ps;
        this.getData();
        break;
      default:
        break;
    }
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const pad = (num: number): string => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  protected coordinateText(value?: number): string {
    if (value === null || value === undefined) return '-';
    return Number(value).toFixed(6);
  }

  protected rainText(value?: number): string {
    if (value === null || value === undefined) return '-';
    return Number(value).toFixed(4);
  }

  protected levelLabel(level?: number): string {
    switch (level) {
      case 0:
        return '无雨';
      case 1:
        return '小雨';
      case 2:
        return '中雨';
      case 3:
        return '大雨';
      case 4:
        return '暴雨';
      default:
        return `等级 ${level ?? '-'}`;
    }
  }

  protected levelClass(level?: number): string {
    switch (level) {
      case 0:
        return 'level-none';
      case 1:
        return 'level-light';
      case 2:
        return 'level-medium';
      case 3:
        return 'level-heavy';
      case 4:
        return 'level-storm';
      default:
        return 'level-unknown';
    }
  }
}
