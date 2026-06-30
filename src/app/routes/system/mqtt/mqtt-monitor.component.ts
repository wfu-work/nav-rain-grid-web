import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { MqttMonitorInfo } from '@shared/types/rain-grid';
import { finalize } from 'rxjs';

import { SystemMonitorService } from '../system-monitor.service';

@Component({
  selector: 'app-mqtt-monitor',
  templateUrl: './mqtt-monitor.component.html',
  styleUrls: ['./mqtt-monitor.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class MqttMonitorComponent implements OnInit {
  private readonly service = inject(SystemMonitorService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected monitor: MqttMonitorInfo | null = null;
  protected lastUpdated = 0;

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    this.service
      .mqtt()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.lastUpdated = Date.now();
          this.cdr.markForCheck();
        }),
      )
      .subscribe((res) => {
        this.monitor = res;
      });
  }

  protected statusTone(): 'success' | 'warning' | 'danger' | 'idle' {
    if (!this.monitor) return 'idle';
    if (!this.monitor.enable) return 'idle';
    if (this.monitor.warnings?.length) return 'warning';
    return this.monitor.running ? 'success' : 'danger';
  }

  protected statusText(): string {
    if (!this.monitor) return '未知';
    if (!this.monitor.enable) return '未启用';
    return this.monitor.running ? '运行中' : '未运行';
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  protected durationSeconds(value?: number): string {
    if (!value || value < 0) return '-';
    if (value < 60) return `${Math.round(value)}s`;
    const minutes = Math.floor(value / 60);
    if (minutes < 60) return `${minutes}m ${Math.round(value % 60)}s`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  }

  protected formatBytes(value?: number): string {
    const bytes = Number(value || 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(size)} ${units[index]}`;
  }
}
