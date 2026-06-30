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

import { DevicesService } from '../devices.service';

@Component({
  selector: 'app-device-distribution',
  templateUrl: './device-distribution.component.html',
  styleUrls: ['./device-distribution.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class DeviceDistributionComponent implements OnInit {
  private readonly service = inject(DevicesService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected devices: Device[] = [];

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

  protected edit(item: Device): void {
    this.router.navigate(['/devices/edit', item.guid], { state: { device: item } });
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

  protected markerLeft(item: Device): number {
    const bounds = this.bounds();
    if (!bounds || item.lng === null || item.lng === undefined) return 50;
    if (bounds.maxLng === bounds.minLng) return 50;
    return this.clamp(
      ((Number(item.lng) - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 86 + 7,
    );
  }

  protected markerTop(item: Device): number {
    const bounds = this.bounds();
    if (!bounds || item.lat === null || item.lat === undefined) return 50;
    if (bounds.maxLat === bounds.minLat) return 50;
    return this.clamp(
      93 - ((Number(item.lat) - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 86,
    );
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

  private bounds(): { minLng: number; maxLng: number; minLat: number; maxLat: number } | null {
    const devices = this.locatedDevices;
    if (devices.length === 0) return null;
    const lngs = devices.map((item) => Number(item.lng));
    const lats = devices.map((item) => Number(item.lat));
    return {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    };
  }

  private clamp(value: number): number {
    return Math.max(4, Math.min(96, value));
  }
}
