import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { Device } from '@shared/types/rain-grid';
import { finalize } from 'rxjs';

import { DeviceMapComponent } from './device-map/device-map.component';
import { DevicesService } from '../devices.service';

@Component({
  selector: 'app-device-distribution',
  templateUrl: './device-distribution.component.html',
  styleUrls: ['./device-distribution.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, DeviceMapComponent],
})
export class DeviceDistributionComponent implements OnInit {
  private readonly service = inject(DevicesService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected devices: Device[] = [];
  protected selectedSncode = '';
  protected showDistance = true;

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    this.service
      .list({ page: 1, size: 999 })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((res) => {
        this.devices = res.data ?? [];
      });
  }

  protected openList(): void {
    this.router.navigate(['/devices/list']);
  }

  protected selectDevice(item: Device): void {
    this.selectedSncode = item.sncode;
    this.cdr.markForCheck();
  }

  protected get locatedDevices(): Device[] {
    return this.devices.filter((item) => this.hasCoordinate(item));
  }

  protected get missingCoordinateTotal(): number {
    return this.devices.length - this.locatedDevices.length;
  }

  protected get onlineTotal(): number {
    return this.devices.filter((item) => item.status === 1).length;
  }

  protected get offlineTotal(): number {
    return this.devices.filter((item) => item.status !== 1).length;
  }

  protected statusLabel(status: number): string {
    return status === 1 ? '在线' : '离线';
  }

  protected coordinateText(item: Device): string {
    if (!this.hasCoordinate(item)) return '未设置坐标';
    return `${Number(item.lng).toFixed(6)}, ${Number(item.lat).toFixed(6)}`;
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  private hasCoordinate(item: Device): boolean {
    return (
      item.lng !== null && item.lng !== undefined && item.lat !== null && item.lat !== undefined
    );
  }
}
