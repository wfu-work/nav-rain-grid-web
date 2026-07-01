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
import { Device, Predict, PredictGroup } from '@shared/types/rain-grid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

import { DevicesService } from '../../devices/devices.service';
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
  private readonly devicesService = inject(DevicesService);
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
  protected devices: Device[] = [];
  protected total = 0;
  protected loading = false;
  protected deviceLoading = false;

  protected readonly columns: Array<STColumn<PredictGroup>> = [
    { title: '北京时间', index: 'baseTime', render: 'baseTimeRender' },
    { title: { text: '预测降雨量', optional: '(mm)' }, render: 'rainSummaryRender' },
    { title: '操作', render: 'actionsRender' },
  ];

  ngOnInit(): void {
    this.loadDevices();
  }

  protected loadDevices(): void {
    this.deviceLoading = true;
    this.devicesService
      .listAll()
      .pipe(
        finalize(() => {
          this.deviceLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (devices) => {
          this.devices = devices ?? [];
          this.q.sncode = this.devices[0]?.sncode ?? '';
          this.getData();
        },
        error: (err) => {
          this.message.error(err?.msg || err?.message || '设备列表加载失败');
          this.getData();
        },
      });
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
    this.q.sncode = this.devices[0]?.sncode ?? '';
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
    const pad = (num: number): string => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  protected sncodes(group: PredictGroup): string[] {
    return Array.from(new Set(group.predictList.map((item) => item.sncode).filter(Boolean)));
  }

  protected firstSncodes(group: PredictGroup): string[] {
    return this.sncodes(group).slice(0, 3);
  }

  protected rainText(value?: number): string {
    if (value === null || value === undefined) return '-';
    return Number(value).toFixed(6);
  }

  protected realRainText(value?: number): string {
    if (value === null || value === undefined) return '-';
    return Number(value).toFixed(6);
  }

  protected predictRainValue(item: Predict): number | undefined {
    return item.predictNewRain ?? item.predictRain;
  }

  protected predictLevelValue(item: Predict): number | undefined {
    return item.predictNewRainLevel ?? item.predictRainLevel;
  }

  protected shouldShowPredictLevel(group: PredictGroup, item: Predict): boolean {
    if (Number(item.type) === 1) return false;
    const baseTime = this.toTimestamp(group.baseTime);
    const predictTime = this.toTimestamp(item.time);
    if (!baseTime || !predictTime) return true;
    const diffHour = Math.round((predictTime - baseTime) / (60 * 60 * 1000));
    return diffHour !== 1;
  }

  protected sortedPredictList(group: PredictGroup): Predict[] {
    return [...group.predictList].sort((prev, next) => {
      const prevTime = prev.time || 0;
      const nextTime = next.time || 0;
      if (prevTime !== nextTime) return prevTime - nextTime;
      return prev.type - next.type;
    });
  }

  protected expandHint(group: PredictGroup): string {
    const count = group.predictList.length;
    if (count === 0) return '暂无明细';
    return `点击展开查看 ${count} 条明细`;
  }

  protected groupRealRain(group: PredictGroup): number | undefined {
    if (group.realRain !== undefined && group.realRain !== null) return group.realRain;
    return group.predictList.find((item) => item.realRain !== undefined && item.realRain !== null)
      ?.realRain;
  }

  protected deviceOptionLabel(device: Device): string {
    if (!device.alias) return device.sncode;
    return `${device.sncode} · ${device.alias}`;
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

  private toTimestamp(value?: number | Date): number | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.getTime();
    return Number.isFinite(value) ? value : undefined;
  }
}
