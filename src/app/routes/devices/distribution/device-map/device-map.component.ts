import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Device } from '@shared/types/rain-grid';

interface DistanceLink {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
  distance: number;
  label: string;
}

@Component({
  selector: 'app-device-map',
  templateUrl: './device-map.component.html',
  styleUrls: ['./device-map.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceMapComponent {
  @Input() devices: Device[] = [];
  @Input() selectedSncode = '';
  @Input() showDistance = false;
  @Input() minHeight = 460;
  @Output() readonly deviceSelect = new EventEmitter<Device>();

  protected get distanceLinks(): DistanceLink[] {
    if (!this.showDistance || this.devices.length < 2) return [];

    const links = new Map<string, DistanceLink>();

    this.devices.forEach((source) => {
      this.devices
        .filter((target) => this.deviceKey(target) !== this.deviceKey(source))
        .map((target) => ({
          target,
          distance: this.distanceBetween(source, target),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
        .forEach(({ target, distance }) => {
          const key = this.linkKey(source, target);
          if (links.has(key)) return;

          const x1 = this.markerLeft(source);
          const y1 = this.markerTop(source);
          const x2 = this.markerLeft(target);
          const y2 = this.markerTop(target);

          links.set(key, {
            key,
            x1,
            y1,
            x2,
            y2,
            labelX: (x1 + x2) / 2,
            labelY: (y1 + y2) / 2,
            distance,
            label: this.distanceText(distance),
          });
        });
    });

    return Array.from(links.values()).sort((a, b) => a.distance - b.distance);
  }

  protected markerLeft(item: Device): number {
    const bounds = this.bounds();
    if (!bounds || item.lng === null || item.lng === undefined) return 50;
    if (bounds.maxLng === bounds.minLng) return 50;
    return this.clamp(
      ((Number(item.lng) - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 80 + 10,
      10,
      90,
    );
  }

  protected markerTop(item: Device): number {
    const bounds = this.bounds();
    if (!bounds || item.lat === null || item.lat === undefined) return 50;
    if (bounds.maxLat === bounds.minLat) return 50;
    return this.clamp(
      86 - ((Number(item.lat) - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 76,
      10,
      86,
    );
  }

  protected coordinateText(item: Device): string {
    if (!this.hasCoordinate(item)) return '未设置坐标';
    return `${Number(item.lng).toFixed(6)}, ${Number(item.lat).toFixed(6)}`;
  }

  protected coordinateLines(item: Device): { lng: string; lat: string } {
    if (!this.hasCoordinate(item)) {
      return { lng: '-', lat: '-' };
    }
    return {
      lng: Number(item.lng).toFixed(6),
      lat: Number(item.lat).toFixed(6),
    };
  }

  private hasCoordinate(item: Device): boolean {
    return (
      item.lng !== null && item.lng !== undefined && item.lat !== null && item.lat !== undefined
    );
  }

  private bounds(): { minLng: number; maxLng: number; minLat: number; maxLat: number } | null {
    if (this.devices.length === 0) return null;
    const lngs = this.devices.map((item) => Number(item.lng));
    const lats = this.devices.map((item) => Number(item.lat));
    return {
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    };
  }

  private clamp(value: number, min = 4, max = 96): number {
    return Math.max(min, Math.min(max, value));
  }

  private distanceBetween(source: Device, target: Device): number {
    const sourceLat = this.toRad(Number(source.lat));
    const targetLat = this.toRad(Number(target.lat));
    const deltaLat = this.toRad(Number(target.lat) - Number(source.lat));
    const deltaLng = this.toRad(Number(target.lng) - Number(source.lng));
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(sourceLat) * Math.cos(targetLat) * Math.sin(deltaLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private distanceText(distance: number): string {
    if (distance < 1) return `${Math.round(distance * 1000)} m`;
    return `${distance.toFixed(distance >= 10 ? 1 : 2)} km`;
  }

  private linkKey(source: Device, target: Device): string {
    return [this.deviceKey(source), this.deviceKey(target)].sort().join('__');
  }

  private deviceKey(item: Device): string {
    return item.guid || item.sncode;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}
