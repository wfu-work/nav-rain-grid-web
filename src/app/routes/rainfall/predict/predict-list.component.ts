import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { STChange, STColumn } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { DatePickerComponent } from '@shared/components/date-picker/date-picker.component';
import { Predict, PredictGroup } from '@shared/types/rain-grid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

import { RainfallService } from '../rainfall.service';

@Component({
  selector: 'app-predict-list',
  templateUrl: './predict-list.component.html',
  styleUrls: ['./predict-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, DatePickerComponent],
})
export class PredictListComponent implements OnInit {
  private readonly service = inject(RainfallService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly q = {
    page: 1,
    size: 10,
    sncode: '',
    dateRange: [] as number[],
  };

  protected data: PredictGroup[] = [];
  protected total = 0;
  protected loading = false;

  protected readonly columns: Array<STColumn<PredictGroup>> = [
    { title: '基准时间', index: 'baseTime', render: 'baseTimeRender', width: 180 },
    { title: '设备', render: 'devicesRender', width: 190 },
    { title: '预测降雨', render: 'rainRender', width: 360 },
    { title: '数据量', render: 'countRender', width: 110 },
    { title: '更新时间', render: 'updateTimeRender', width: 170 },
    { title: '操作', render: 'actionsRender', width: 110 },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    this.service
      .predictList({
        page: this.q.page,
        size: this.q.size,
        sncode: this.q.sncode.trim(),
        startTime: this.toTimestamp(this.q.dateRange[0]),
        endTime: this.toTimestamp(this.q.dateRange[1]),
      })
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
    this.q.sncode = '';
    this.q.dateRange = [];
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

  protected remove(item: PredictGroup): void {
    this.modal.confirm({
      nzTitle: '删除预测数据',
      nzContent: `确定删除「${this.formatTime(item.baseTime)}」这一组预测数据吗？`,
      nzOkDanger: true,
      nzOkText: '删除',
      nzCancelText: '取消',
      nzOnOk: () =>
        this.service.deletePredict({ baseTime: item.baseTime }).subscribe({
          next: () => {
            this.message.success('预测数据已删除');
            if (this.data.length === 1 && this.q.page > 1) {
              this.q.page -= 1;
            }
            this.getData();
          },
          error: (err) => this.message.error(err?.msg || err?.message || '删除预测数据失败'),
        }),
    });
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  protected sncodes(group: PredictGroup): string[] {
    return Array.from(new Set(group.predictList.map((item) => item.sncode).filter(Boolean)));
  }

  protected firstSncodes(group: PredictGroup): string[] {
    return this.sncodes(group).slice(0, 3);
  }

  protected latestUpdate(group: PredictGroup): number | undefined {
    const values = group.predictList
      .map((item) => item.updateTime || item.createTime || 0)
      .filter((item) => item > 0);
    if (values.length === 0) return undefined;
    return Math.max(...values);
  }

  protected horizonItems(group: PredictGroup): Predict[] {
    const selected = new Map<number, Predict>();
    group.predictList.forEach((item) => {
      if (!selected.has(item.type)) selected.set(item.type, item);
    });
    return [1, 12, 24]
      .map((type) => selected.get(type))
      .filter((item): item is Predict => Boolean(item));
  }

  protected typeLabel(type: number): string {
    if (type === 1 || type === 12 || type === 24) return `${type} 小时`;
    return `${type}`;
  }

  protected rainText(value?: number): string {
    if (value === null || value === undefined) return '-';
    return `${Number(value).toFixed(2)} mm`;
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

  private toTimestamp(value?: number | Date): number | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.getTime();
    return Number.isFinite(value) ? value : undefined;
  }
}
