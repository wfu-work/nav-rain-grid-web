import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { STChange, STColumn } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { Grid, GridDiffPoint, GridDiffTask } from '@shared/types/rain-grid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { GridsService } from '../grids.service';

type DataHorizon = '1h' | '12h' | '24h';

interface HorizonOption {
  label: string;
  value: DataHorizon;
}

@Component({
  selector: 'app-grid-data-list',
  templateUrl: './grid-data-list.component.html',
  styleUrls: ['./grid-data-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class GridDataListComponent implements OnInit {
  private readonly service = inject(GridsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly horizonOptions: HorizonOption[] = [
    { label: '1 小时', value: '1h' },
    { label: '12 小时', value: '12h' },
    { label: '24 小时', value: '24h' },
  ];

  protected readonly q = {
    page: 1,
    size: 10,
    gridGuid: '',
    taskGuid: '',
    horizon: '1h' as DataHorizon,
  };

  protected grids: Grid[] = [];
  protected tasks: GridDiffTask[] = [];
  protected data: GridDiffPoint[] = [];
  protected total = 0;
  protected loading = false;
  protected optionsLoading = false;

  protected get filteredTasks(): GridDiffTask[] {
    if (!this.q.gridGuid) return this.tasks;
    return this.tasks.filter((item) => item.gridGuid === this.q.gridGuid);
  }

  protected get columns(): Array<STColumn<GridDiffPoint>> {
    return [
      { title: '格网', index: 'gridName', render: 'gridRender', width: 210 },
      { title: '中心点', render: 'centerRender', width: 170 },
      { title: '基准时间', index: 'baseTime', render: 'baseTimeRender', width: 160 },
      { title: this.horizonTitle, render: 'rainRender', width: 150 },
      { title: '更新时间', index: 'updateTime', render: 'timeRender', width: 160 },
    ];
  }

  ngOnInit(): void {
    this.loadOptions();
  }

  protected get horizonTitle(): string {
    return `${this.horizonOptions.find((item) => item.value === this.q.horizon)?.label ?? '1 小时'}降雨`;
  }

  protected loadOptions(): void {
    this.optionsLoading = true;
    forkJoin({
      grids: this.service.query({}).pipe(catchError(() => of([] as Grid[]))),
      tasks: this.service.taskQuery({}).pipe(catchError(() => of([] as GridDiffTask[]))),
    })
      .pipe(
        finalize(() => {
          this.optionsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ grids, tasks }) => {
        this.grids = grids ?? [];
        this.tasks = tasks ?? [];
        this.useDefaultTask();
        this.getData();
      });
  }

  protected getData(): void {
    this.loading = true;
    this.service
      .pointList({
        page: this.q.page,
        size: this.q.size,
        gridGuid: this.q.gridGuid,
        taskGuid: this.q.taskGuid,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res) => {
          this.data = res.data ?? [];
          this.total = res.total ?? 0;
          this.q.page = res.page || this.q.page;
          this.q.size = res.size || this.q.size;
        },
        error: (err) => this.message.error(err?.msg || err?.message || '读取格网数据失败'),
      });
  }

  protected onGridChange(gridGuid: string): void {
    this.q.gridGuid = gridGuid;
    const firstTask = this.filteredTasks[0];
    this.q.taskGuid = firstTask?.guid ?? '';
    this.search();
  }

  protected onTaskChange(taskGuid: string): void {
    this.q.taskGuid = taskGuid;
    const task = this.tasks.find((item) => item.guid === taskGuid);
    if (task?.gridGuid) {
      this.q.gridGuid = task.gridGuid;
    }
    this.search();
  }

  protected search(): void {
    this.q.page = 1;
    this.getData();
  }

  protected resetQuery(): void {
    this.q.page = 1;
    this.q.gridGuid = '';
    this.q.taskGuid = '';
    this.q.horizon = '1h';
    this.useDefaultTask();
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

  protected taskLabel(item: GridDiffTask): string {
    return `${item.gridName || '未命名格网'}｜${this.formatTime(item.baseTime)}`;
  }

  protected rainValue(item: GridDiffPoint): number | undefined {
    switch (this.q.horizon) {
      case '12h':
        return item.predictRain12h;
      case '24h':
        return item.predictRain24h;
      default:
        return item.predictRain1h;
    }
  }

  protected levelValue(item: GridDiffPoint): number | undefined {
    switch (this.q.horizon) {
      case '12h':
        return item.predictRainLevel12h;
      case '24h':
        return item.predictRainLevel24h;
      default:
        return item.predictRainLevel1h;
    }
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

  private useDefaultTask(): void {
    if (this.q.taskGuid || this.tasks.length === 0) return;
    const firstTask = this.tasks[0];
    this.q.taskGuid = firstTask.guid;
    this.q.gridGuid = firstTask.gridGuid || '';
  }
}
