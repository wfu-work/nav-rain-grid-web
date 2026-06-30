import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { Device, Grid, ServerDiskInfo, SystemMonitorInfo } from '@shared/types/rain-grid';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { DevicesService } from '../../devices/devices.service';
import { GridsService } from '../../grids/grids.service';
import { SystemMonitorService } from '../system-monitor.service';

interface MonitorMetric {
  label: string;
  value: number;
  hint: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'idle';
  link: string;
}

@Component({
  selector: 'app-operation-monitor',
  templateUrl: './operation-monitor.component.html',
  styleUrls: ['./operation-monitor.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class OperationMonitorComponent implements OnInit, OnDestroy {
  private readonly devicesService = inject(DevicesService);
  private readonly gridsService = inject(GridsService);
  private readonly systemMonitorService = inject(SystemMonitorService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  protected loading = false;
  protected autoRefresh = true;
  protected lastUpdated = 0;
  protected deviceTotal = 0;
  protected onlineDeviceTotal = 0;
  protected offlineDeviceTotal = 0;
  protected enabledGridTotal = 0;
  protected disabledGridTotal = 0;
  protected recentDevices: Device[] = [];
  protected grids: Grid[] = [];
  protected systemMonitor: SystemMonitorInfo | null = null;

  ngOnInit(): void {
    this.getData();
  }

  ngOnDestroy(): void {
    this.clearRefreshTimer();
  }

  protected getData(): void {
    this.loading = true;
    this.clearRefreshTimer();
    forkJoin({
      devices: this.devicesService.list({ page: 1, size: 6 }).pipe(catchError(() => of(null))),
      onlineDevices: this.devicesService
        .list({ page: 1, size: 1, status: 1 })
        .pipe(catchError(() => of(null))),
      offlineDevices: this.devicesService
        .list({ page: 1, size: 1, status: 0 })
        .pipe(catchError(() => of(null))),
      enabledGrids: this.gridsService
        .list({ page: 1, size: 1, status: 1 })
        .pipe(catchError(() => of(null))),
      disabledGrids: this.gridsService
        .list({ page: 1, size: 1, status: 0 })
        .pipe(catchError(() => of(null))),
      grids: this.gridsService.list({ page: 1, size: 5 }).pipe(catchError(() => of(null))),
      systemMonitor: this.systemMonitorService.runtime().pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.lastUpdated = Date.now();
          this.scheduleRefresh();
          this.cdr.markForCheck();
        }),
      )
      .subscribe(
        ({
          devices,
          onlineDevices,
          offlineDevices,
          enabledGrids,
          disabledGrids,
          grids,
          systemMonitor,
        }) => {
          this.deviceTotal = devices?.total ?? 0;
          this.onlineDeviceTotal = onlineDevices?.total ?? 0;
          this.offlineDeviceTotal = offlineDevices?.total ?? 0;
          this.enabledGridTotal = enabledGrids?.total ?? 0;
          this.disabledGridTotal = disabledGrids?.total ?? 0;
          this.recentDevices = devices?.data ?? [];
          this.grids = grids?.data ?? [];
          this.systemMonitor = systemMonitor;
        },
      );
  }

  protected toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.scheduleRefresh();
    } else {
      this.clearRefreshTimer();
    }
  }

  protected metrics(): MonitorMetric[] {
    return [
      {
        label: '设备总数',
        value: this.deviceTotal,
        hint: '接入 MQTT 的设备记录',
        tone: this.deviceTotal > 0 ? 'primary' : 'idle',
        link: '/devices/list',
      },
      {
        label: '在线设备',
        value: this.onlineDeviceTotal,
        hint: '最近 10 分钟内有心跳',
        tone: this.onlineDeviceTotal > 0 ? 'success' : 'idle',
        link: '/devices/list',
      },
      {
        label: '离线设备',
        value: this.offlineDeviceTotal,
        hint: '超过 10 分钟未上报心跳',
        tone: this.offlineDeviceTotal > 0 ? 'warning' : 'success',
        link: '/devices/list',
      },
      {
        label: '启用格网',
        value: this.enabledGridTotal,
        hint: '参与每小时降雨差分计算',
        tone: this.enabledGridTotal > 0 ? 'success' : 'idle',
        link: '/grids/list',
      },
      {
        label: '禁用格网',
        value: this.disabledGridTotal,
        hint: '暂不参与降雨格网输出',
        tone: this.disabledGridTotal > 0 ? 'warning' : 'idle',
        link: '/grids/list',
      },
    ];
  }

  protected openLink(link: string): void {
    this.router.navigateByUrl(link);
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

  protected diskPercent(item: ServerDiskInfo): number {
    return this.clampPercent(item.usedPercent);
  }

  protected firstDisk(): ServerDiskInfo | null {
    return this.systemMonitor?.disk?.[0] ?? null;
  }

  protected percentStatus(value: number): 'success' | 'exception' | 'active' | 'normal' {
    if (value >= 90) return 'exception';
    if (value >= 75) return 'active';
    if (value <= 50) return 'success';
    return 'normal';
  }

  protected gridDeviceCount(value?: string): number {
    return (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0).length;
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

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', { hour12: false });
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

  private clampPercent(value: number): number {
    return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
  }

  private scheduleRefresh(): void {
    if (!this.autoRefresh) return;
    this.clearRefreshTimer();
    this.refreshTimer = setTimeout(() => this.getData(), 5000);
  }

  private clearRefreshTimer(): void {
    if (!this.refreshTimer) return;
    clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }
}
