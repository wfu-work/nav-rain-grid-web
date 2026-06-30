import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { Device, Grid, SaveGridPayload } from '@shared/types/rain-grid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

import { DeviceMapComponent } from '../../devices/distribution/device-map/device-map.component';
import { DevicesService } from '../../devices/devices.service';
import { GridsService } from '../grids.service';

interface GridRouteState {
  grid?: Grid;
}

@Component({
  selector: 'app-grid-edit',
  templateUrl: './grid-edit.component.html',
  styleUrls: ['./grid-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, DeviceMapComponent],
})
export class GridEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(GridsService);
  private readonly devicesService = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected guid = '';
  protected loading = false;
  protected saving = false;
  protected devicesLoading = false;
  protected grid: Grid | null = null;
  protected devices: Device[] = [];
  protected selectedSampleSncode = '';

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    sncodes: this.fb.control<string[]>([]),
    resolution: ['1km'],
    min_device: [3, [Validators.required, Validators.min(1)]],
    min_distance: [3, [Validators.required, Validators.min(0)]],
    status: [1, [Validators.required]],
  });

  ngOnInit(): void {
    this.guid = this.route.snapshot.paramMap.get('guid') ?? '';
    this.loadDevices();
    const state = globalThis.history.state as GridRouteState;
    if (state.grid?.guid === this.guid) {
      this.patchForm(state.grid);
    }
    if (this.guid) {
      this.loadGrid();
    }
  }

  protected get pageTitle(): string {
    return this.guid ? '编辑格网' : '新建格网';
  }

  protected get pageDescription(): string {
    return this.guid
      ? '维护格网设备集合、分辨率、最少设备和最小距离。'
      : '创建参与降雨差分计算的格网配置。';
  }

  protected save(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    const value = this.form.getRawValue();
    const payload: SaveGridPayload = {
      name: this.trim(value.name),
      sncodes: this.normalizeSncodes(value.sncodes),
      resolution: this.trim(value.resolution),
      min_device: Number(value.min_device ?? 1),
      min_distance: Number(value.min_distance ?? 0),
      status: Number(value.status ?? 0),
    };

    this.saving = true;
    this.service
      .save(payload, this.guid)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success(this.guid ? '格网已更新' : '格网已创建');
          this.back();
        },
        error: (err) => this.message.error(err?.msg || err?.message || '保存格网失败'),
      });
  }

  protected back(): void {
    this.router.navigate(['/grids/list']);
  }

  protected get selectedSampleDevices(): Device[] {
    const sncodes = new Set(this.form.controls.sncodes.value ?? []);
    return this.devices.filter((item) => sncodes.has(item.sncode) && this.hasCoordinate(item));
  }

  protected get selectedDeviceCount(): number {
    return this.form.controls.sncodes.value?.length ?? 0;
  }

  protected get selectedMissingCoordinateCount(): number {
    return this.selectedDeviceCount - this.selectedSampleDevices.length;
  }

  protected selectSampleDevice(item: Device): void {
    this.selectedSampleSncode = item.sncode;
    this.cdr.markForCheck();
  }

  private loadGrid(): void {
    this.loading = true;
    this.service
      .get(this.guid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (grid) => this.patchForm(grid),
        error: (err) => this.message.error(err?.msg || err?.message || '读取格网失败'),
      });
  }

  private loadDevices(): void {
    this.devicesLoading = true;
    this.devicesService
      .listAll()
      .pipe(
        finalize(() => {
          this.devicesLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (devices) => {
          this.devices = devices ?? [];
        },
        error: (err) => this.message.error(err?.msg || err?.message || '读取设备列表失败'),
      });
  }

  private patchForm(grid: Grid): void {
    this.grid = grid;
    this.form.reset({
      name: grid.name ?? '',
      sncodes: this.splitSncodes(grid.sncodes),
      resolution: grid.resolution ?? '1km',
      min_device: grid.min_device ?? 3,
      min_distance: grid.min_distance ?? 3,
      status: grid.status ?? 0,
    });
  }

  private trim(value?: string | null): string {
    return (value ?? '').trim();
  }

  protected deviceLabel(device: Device): string {
    return device.alias
      ? `${device.sncode} - ${device.alias}（${device.lng}, ${device.lat}）`
      : `${device.sncode}（${device.lng}, ${device.lat}）`;
  }

  private hasCoordinate(item: Device): boolean {
    return (
      item.lng !== null && item.lng !== undefined && item.lat !== null && item.lat !== undefined
    );
  }

  private normalizeSncodes(value?: string[] | string | null): string {
    const values = Array.isArray(value) ? value : this.splitSncodes(value);
    return values
      .map((item) => this.trim(item))
      .filter(Boolean)
      .join(',');
  }

  private splitSncodes(value?: string | null): string[] {
    return (value ?? '')
      .split(/[,，\n\r\s]+/)
      .map((item) => this.trim(item))
      .filter(Boolean);
  }
}
