import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { Grid, GridDiffPoint, GridDiffTask } from '@shared/types/rain-grid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { GridsService } from '../grids.service';

type HeatHorizon = '1h' | '12h' | '24h';

interface HorizonOption {
  label: string;
  value: HeatHorizon;
}

interface HeatPointView {
  key: string;
  left: number;
  top: number;
  size: number;
  rain: number;
  level: number;
  color: string;
  label: string;
  coordinate: string;
  time: string;
  tooltip: string;
}

interface HeatSummary {
  total: number;
  valid: number;
  maxRain: number;
  avgRain: number;
  warningCount: number;
}

@Component({
  selector: 'app-grid-graphic',
  templateUrl: './grid-graphic.component.html',
  styleUrls: ['./grid-graphic.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class GridGraphicComponent implements OnInit {
  private readonly service = inject(GridsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly horizonOptions: HorizonOption[] = [
    { label: '1 小时', value: '1h' },
    { label: '12 小时', value: '12h' },
    { label: '24 小时', value: '24h' },
  ];

  protected readonly q = {
    gridGuid: '',
    taskGuid: '',
    horizon: '1h' as HeatHorizon,
  };

  protected grids: Grid[] = [];
  protected tasks: GridDiffTask[] = [];
  protected points: GridDiffPoint[] = [];
  protected optionsLoading = false;
  protected loading = false;

  ngOnInit(): void {
    this.loadOptions();
  }

  protected get filteredTasks(): GridDiffTask[] {
    if (!this.q.gridGuid) return this.tasks;
    return this.tasks.filter((item) => item.gridGuid === this.q.gridGuid);
  }

  protected get heatPoints(): HeatPointView[] {
    const maxRain = this.summary.maxRain;
    const bounds = this.bounds();
    return this.points
      .filter((item) => this.hasCoordinate(item))
      .map((item) => {
        const rain = this.rainValue(item);
        const level = this.levelValue(item);
        const intensity = maxRain > 0 ? rain / maxRain : 0;
        const size = 26 + Math.min(42, Math.max(0, intensity * 42));
        const color = this.levelColor(level, rain);
        return {
          key: item.guid || `${item.gridGuid}-${item.centerLng}-${item.centerLat}`,
          left: this.pointLeft(item, bounds),
          top: this.pointTop(item, bounds),
          size,
          rain,
          level,
          color,
          label: item.gridName || '未命名格网',
          coordinate: `${this.coordinateText(item.centerLng)}, ${this.coordinateText(item.centerLat)}`,
          time: this.formatTime(this.predictTime(item)),
          tooltip: `${item.gridName || '格网中心点'}｜${rain.toFixed(4)} mm｜${this.levelLabel(level)}`,
        };
      });
  }

  protected get topPoints(): HeatPointView[] {
    return [...this.heatPoints].sort((a, b) => b.rain - a.rain).slice(0, 8);
  }

  protected get summary(): HeatSummary {
    const validPoints = this.points.filter((item) => this.hasCoordinate(item));
    const values = validPoints.map((item) => this.rainValue(item));
    const totalRain = values.reduce((sum, value) => sum + value, 0);
    const maxRain = values.length > 0 ? Math.max(...values) : 0;
    return {
      total: this.points.length,
      valid: validPoints.length,
      maxRain,
      avgRain: values.length > 0 ? totalRain / values.length : 0,
      warningCount: validPoints.filter((item) => this.levelValue(item) >= 3).length,
    };
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
      .pointQuery({
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
        next: (points) => {
          this.points = points ?? [];
        },
        error: (err) => this.message.error(err?.msg || err?.message || '读取格网图形数据失败'),
      });
  }

  protected onGridChange(gridGuid: string): void {
    this.q.gridGuid = gridGuid;
    const firstTask = this.filteredTasks[0];
    this.q.taskGuid = firstTask?.guid ?? '';
    this.getData();
  }

  protected onTaskChange(taskGuid: string): void {
    this.q.taskGuid = taskGuid;
    const task = this.tasks.find((item) => item.guid === taskGuid);
    if (task?.gridGuid) {
      this.q.gridGuid = task.gridGuid;
    }
    this.getData();
  }

  protected resetQuery(): void {
    this.q.gridGuid = '';
    this.q.taskGuid = '';
    this.q.horizon = '1h';
    this.useDefaultTask();
    this.getData();
  }

  protected taskLabel(item: GridDiffTask): string {
    const countText = item.pointCount ? `${item.pointCount} 点` : '无点位';
    return `${item.gridName || '未命名格网'}｜${this.formatTime(item.baseTime)}｜${countText}`;
  }

  protected rainText(value: number): string {
    return `${value.toFixed(4)} mm`;
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

  private useDefaultTask(): void {
    if (this.q.taskGuid || this.tasks.length === 0) return;
    const firstTask = this.tasks[0];
    this.q.taskGuid = firstTask.guid;
    this.q.gridGuid = firstTask.gridGuid || '';
  }

  private rainValue(item: GridDiffPoint): number {
    switch (this.q.horizon) {
      case '12h':
        return Number(item.predictRain12h ?? 0);
      case '24h':
        return Number(item.predictRain24h ?? 0);
      default:
        return Number(item.predictRain1h ?? 0);
    }
  }

  private levelValue(item: GridDiffPoint): number {
    switch (this.q.horizon) {
      case '12h':
        return Number(item.predictRainLevel12h ?? 0);
      case '24h':
        return Number(item.predictRainLevel24h ?? 0);
      default:
        return Number(item.predictRainLevel1h ?? 0);
    }
  }

  private predictTime(item: GridDiffPoint): number {
    switch (this.q.horizon) {
      case '12h':
        return item.predictTime12h;
      case '24h':
        return item.predictTime24h;
      default:
        return item.predictTime1h;
    }
  }

  private levelColor(level: number, rain: number): string {
    if (rain <= 0 || level <= 0) return '#94a3b8';
    if (level === 1) return '#22c55e';
    if (level === 2) return '#eab308';
    if (level === 3) return '#f97316';
    return '#ef4444';
  }

  private hasCoordinate(item: GridDiffPoint): boolean {
    return (
      item.centerLng !== null &&
      item.centerLng !== undefined &&
      item.centerLat !== null &&
      item.centerLat !== undefined
    );
  }

  private bounds(): { minLng: number; maxLng: number; minLat: number; maxLat: number } | null {
    const items = this.points.filter((item) => this.hasCoordinate(item));
    if (items.length === 0) return null;
    const lngs = items.map((item) => Number(item.centerLng));
    const lats = items.map((item) => Number(item.centerLat));
    return {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    };
  }

  private pointLeft(
    item: GridDiffPoint,
    bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number } | null,
  ): number {
    if (!bounds || bounds.maxLng === bounds.minLng) return 50;
    return this.clamp(((Number(item.centerLng) - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 84 + 8);
  }

  private pointTop(
    item: GridDiffPoint,
    bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number } | null,
  ): number {
    if (!bounds || bounds.maxLat === bounds.minLat) return 50;
    return this.clamp(90 - ((Number(item.centerLat) - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 78);
  }

  private clamp(value: number, min = 6, max = 94): number {
    return Math.max(min, Math.min(max, value));
  }
}
