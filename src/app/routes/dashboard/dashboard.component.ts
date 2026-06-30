import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { Device, Grid, ServerDiskInfo, SystemMonitorInfo } from '@shared/types/rain-grid';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { PanelComponent } from 'src/app/shared/components/panel/panel.component';

import { DevicesService } from '../devices/devices.service';
import { GridsService } from '../grids/grids.service';
import { SystemMonitorService } from '../system/system-monitor.service';

type DashboardTone = 'success' | 'idle' | 'warning';

interface QuickAction {
  title: string;
  desc: string;
  icon: string;
  link: string;
}

interface DashboardCheck {
  name: string;
  flow: string;
  status: string;
  tone: DashboardTone;
  link: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, PanelComponent],
})
export class DashboardComponent implements OnInit {
  private readonly devicesService = inject(DevicesService);
  private readonly gridsService = inject(GridsService);
  private readonly systemMonitorService = inject(SystemMonitorService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected lastUpdated = 0;
  protected deviceTotal = 0;
  protected onlineDeviceTotal = 0;
  protected offlineDeviceTotal = 0;
  protected gridTotal = 0;
  protected enabledGridTotal = 0;
  protected disabledGridTotal = 0;
  protected recentDevices: Device[] = [];
  protected grids: Grid[] = [];
  protected checks: DashboardCheck[] = [];
  protected systemMonitor: SystemMonitorInfo | null = null;

  protected readonly quickActions: QuickAction[] = [
    {
      title: '设备管理',
      desc: '维护设备号、别名、坐标和能力开关',
      icon: 'deployment-unit',
      link: '/devices/list',
    },
    {
      title: '格网管理',
      desc: '配置参与差分计算的设备集合和格网参数',
      icon: 'border',
      link: '/grids/list',
    },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    forkJoin({
      devices: this.devicesService.list({ page: 1, size: 6 }).pipe(catchError(() => of(null))),
      onlineDevices: this.devicesService
        .list({ page: 1, size: 1, status: 1 })
        .pipe(catchError(() => of(null))),
      offlineDevices: this.devicesService
        .list({ page: 1, size: 1, status: 0 })
        .pipe(catchError(() => of(null))),
      grids: this.gridsService.list({ page: 1, size: 6 }).pipe(catchError(() => of(null))),
      enabledGrids: this.gridsService
        .list({ page: 1, size: 1, status: 1 })
        .pipe(catchError(() => of(null))),
      disabledGrids: this.gridsService
        .list({ page: 1, size: 1, status: 0 })
        .pipe(catchError(() => of(null))),
      systemMonitor: this.systemMonitorService.runtime().pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.lastUpdated = Date.now();
          this.cdr.markForCheck();
        }),
      )
      .subscribe(
        ({
          devices,
          onlineDevices,
          offlineDevices,
          grids,
          enabledGrids,
          disabledGrids,
          systemMonitor,
        }) => {
          this.deviceTotal = devices?.total ?? 0;
          this.onlineDeviceTotal = onlineDevices?.total ?? 0;
          this.offlineDeviceTotal = offlineDevices?.total ?? 0;
          this.gridTotal = grids?.total ?? 0;
          this.enabledGridTotal = enabledGrids?.total ?? 0;
          this.disabledGridTotal = disabledGrids?.total ?? 0;
          this.recentDevices = devices?.data ?? [];
          this.grids = grids?.data ?? [];
          this.systemMonitor = systemMonitor;
          this.checks = this.buildChecks();
        },
      );
  }

  protected get deviceValue(): string {
    return `${this.deviceTotal}`;
  }

  protected get gridValue(): string {
    return `${this.gridTotal}`;
  }

  protected get offlineValue(): string {
    return `${this.offlineDeviceTotal}`;
  }

  protected get enabledGridValue(): string {
    return `${this.enabledGridTotal}`;
  }

  protected statusLabel(status: number): string {
    return status === 1 ? '在线' : '离线';
  }

  protected gridStatusLabel(status: number): string {
    return status === 1 ? '启用' : '禁用';
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  protected coordinateText(item: Device): string {
    if (
      item.lng === null ||
      item.lng === undefined ||
      item.lat === null ||
      item.lat === undefined
    ) {
      return '未设置坐标';
    }
    return `${Number(item.lng).toFixed(6)}, ${Number(item.lat).toFixed(6)}`;
  }

  protected sncodeCount(value?: string): number {
    return (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0).length;
  }

  protected serviceHealthTone(): 'success' | 'warning' | 'danger' | 'idle' {
    if (!this.systemMonitor) return 'idle';
    if (this.systemMonitor.warnings?.length) return 'warning';
    return this.systemMonitor.service.status === 'running' ? 'success' : 'danger';
  }

  protected cpuPercent(): number {
    const cpus = this.systemMonitor?.cpu?.cpus ?? [];
    if (cpus.length === 0) return 0;
    const total = cpus.reduce((sum, item) => sum + Number(item || 0), 0);
    return this.clampPercent(total / cpus.length);
  }

  protected memoryPercent(): number {
    return this.clampPercent(this.systemMonitor?.ram?.usedPercent ?? 0);
  }

  protected firstDisk(): ServerDiskInfo | null {
    return this.systemMonitor?.disk?.[0] ?? null;
  }

  protected diskPercent(item: ServerDiskInfo): number {
    return this.clampPercent(item.usedPercent);
  }

  protected percentStatus(value: number): 'success' | 'exception' | 'active' | 'normal' {
    if (value >= 90) return 'exception';
    if (value >= 75) return 'active';
    if (value <= 50) return 'success';
    return 'normal';
  }

  protected formatBytes(value?: number): string {
    const bytes = Number(value || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(size)} ${units[index]}`;
  }

  protected formatMb(value?: number): string {
    return this.formatBytes((value || 0) * 1024 * 1024);
  }

  protected duration(value?: number): string {
    if (!value || value < 0) return '-';
    if (value < 1000) return `${value}ms`;
    const seconds = Math.round(value / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  protected durationSeconds(value?: number): string {
    return this.duration((value || 0) * 1000);
  }

  private buildChecks(): DashboardCheck[] {
    return [
      {
        name: '设备心跳',
        flow: '超过 10 分钟未上报心跳的设备会被定时任务设置为离线',
        status: this.offlineDeviceTotal > 0 ? `${this.offlineDeviceTotal} 离线` : '正常',
        tone: this.offlineDeviceTotal > 0 ? 'warning' : 'success',
        link: '/devices/list',
      },
      {
        name: '格网配置',
        flow: '启用格网会参与每小时的降雨差分计算和 Excel 输出',
        status: this.enabledGridTotal > 0 ? `${this.enabledGridTotal} 启用` : '未启用',
        tone: this.enabledGridTotal > 0 ? 'success' : 'idle',
        link: '/grids/list',
      },
      {
        name: '设备坐标',
        flow: '设备经纬度是格网中心点差分计算的基础输入',
        status: this.recentDevices.some(
          (item) =>
            item.lng === null ||
            item.lng === undefined ||
            item.lat === null ||
            item.lat === undefined,
        )
          ? '需完善'
          : '已配置',
        tone: this.recentDevices.some(
          (item) =>
            item.lng === null ||
            item.lng === undefined ||
            item.lat === null ||
            item.lat === undefined,
        )
          ? 'warning'
          : 'success',
        link: '/devices/list',
      },
    ];
  }

  private clampPercent(value: number): number {
    return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
  }
}
