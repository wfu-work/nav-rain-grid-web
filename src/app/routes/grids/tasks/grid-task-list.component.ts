import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { STChange, STColumn } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { GridDiffTask } from '@shared/types/rain-grid';
import { finalize } from 'rxjs';

import { GridsService } from '../grids.service';

@Component({
  selector: 'app-grid-task-list',
  templateUrl: './grid-task-list.component.html',
  styleUrls: ['./grid-task-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class GridTaskListComponent implements OnInit {
  private readonly service = inject(GridsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly q = {
    page: 1,
    size: 10,
    content: '',
    status: '',
  };

  protected data: GridDiffTask[] = [];
  protected total = 0;
  protected loading = false;

  protected readonly columns: Array<STColumn<GridDiffTask>> = [
    { title: '任务', index: 'gridName', render: 'taskRender', width: 220 },
    { title: '基准时间', index: 'baseTime', render: 'baseTimeRender', width: 170 },
    { title: '格网参数', render: 'gridRender', width: 160 },
    { title: '点位数量', index: 'pointCount', render: 'pointRender', width: 110 },
    { title: '状态', index: 'status', render: 'statusRender', width: 90 },
    { title: '更新时间', index: 'updateTime', render: 'timeRender', width: 160 },
    { title: '错误信息', index: 'errorMsg', render: 'errorRender', width: 220 },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    this.service
      .taskList(this.q)
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
    this.q.status = '';
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

  protected statusLabel(status: number): string {
    switch (status) {
      case 1:
        return '成功';
      case 2:
        return '失败';
      default:
        return '未知';
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

  protected resolutionText(value?: number): string {
    if (value === null || value === undefined) return '-';
    return `${Number(value).toFixed(4)}°`;
  }

  protected kilometerText(value?: number): string {
    if (value === null || value === undefined) return '-';
    return `${Math.round(Number(value) * 100)} km`;
  }
}
