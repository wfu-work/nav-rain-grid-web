import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { Device, Grid, SaveGridPayload } from '@shared/types/rain-grid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

import { DevicesService } from '../../devices/devices.service';
import { DeviceMapComponent } from '../../devices/distribution/device-map/device-map.component';
import { GridsService } from '../grids.service';

interface GridRouteState {
  grid?: Grid;
}

interface ResolutionOption {
  label: string;
  value: number;
}

const minArrayLength =
  (minLength: number): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    const length = Array.isArray(value) ? value.length : 0;
    return length >= minLength
      ? null
      : { minArrayLength: { requiredLength: minLength, actualLength: length } };
  };

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
  protected readonly resolutionOptions: ResolutionOption[] = [
    { label: '1 公里（0.01）', value: 0.01 },
    { label: '2 公里（0.02）', value: 0.02 },
  ];

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    sncodes: this.fb.control<string[]>([], [minArrayLength(3), this.deviceSampleValidator()]),
    resolution: [0.01, [Validators.required]],
    minDevice: [3, [Validators.required, Validators.min(3)]],
    minDistance: [5, [Validators.required, Validators.min(3)]],
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
      resolution: this.normalizeResolution(value.resolution),
      minDevice: Number(value.minDevice ?? 3),
      minDistance: Number(value.minDistance ?? 5),
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

  protected sampleDeviceErrorMessage(): string {
    const control = this.form.controls.sncodes;
    const errors = control.errors;
    if (!errors || (!control.dirty && !control.touched)) return '';
    if (errors['minArrayLength']) return '请至少选择 3 台参与计算的设备。';
    if (errors['missingCoordinate']) {
      const names = (errors['missingCoordinate'].devices as string[]).join('、');
      return `${names} 未维护经纬度，无法参与 5 公里距离校验。`;
    }
    if (errors['isolatedDevice']) {
      const names = (errors['isolatedDevice'].devices as string[]).join('、');
      return `${names} 与任意已选组网设备的距离都超过 5 公里，请调整设备样本。`;
    }
    return '';
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
          this.form.controls.sncodes.updateValueAndValidity({ emitEvent: false });
        },
        error: (err) => this.message.error(err?.msg || err?.message || '读取设备列表失败'),
      });
  }

  private patchForm(grid: Grid): void {
    this.grid = grid;
    this.form.reset({
      name: grid.name ?? '',
      sncodes: this.splitSncodes(grid.sncodes),
      resolution: this.normalizeResolution(grid.resolution),
      minDevice: grid.minDevice ?? 3,
      minDistance: grid.minDistance ?? 3,
      status: grid.status ?? 0,
    });
  }

  private trim(value?: string | null): string {
    return (value ?? '').trim();
  }

  private normalizeResolution(value?: string | number | null): number {
    if (value === null || value === undefined || value === '') return 0.01;
    if (typeof value === 'number') {
      return this.resolutionOptions.some((item) => item.value === value) ? value : 0.01;
    }
    const normalized = this.trim(value).toLowerCase();
    if (normalized === '1km' || normalized === '1公里') return 0.01;
    if (normalized === '2km' || normalized === '2公里') return 0.02;
    const numericValue = Number(normalized);
    return this.resolutionOptions.some((item) => item.value === numericValue) ? numericValue : 0.01;
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

  private deviceSampleValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const selectedSncodes = Array.isArray(control.value) ? control.value : [];
      if (selectedSncodes.length < 3 || this.devices.length === 0) return null;

      const selectedDevices = selectedSncodes
        .map((sncode) => this.devices.find((item) => item.sncode === sncode))
        .filter((item): item is Device => !!item);
      const missingCoordinateDevices = selectedDevices
        .filter((item) => !this.hasCoordinate(item))
        .map((item) => item.alias || item.sncode);

      if (missingCoordinateDevices.length > 0) {
        return { missingCoordinate: { devices: missingCoordinateDevices } };
      }

      const isolatedDevices = selectedDevices.filter((source) =>
        selectedDevices.every((target) => {
          if (target.sncode === source.sncode) return true;
          return this.distanceBetween(source, target) > 5;
        }),
      );

      if (isolatedDevices.length > 0) {
        return {
          isolatedDevice: { devices: isolatedDevices.map((item) => item.alias || item.sncode) },
        };
      }

      return null;
    };
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

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
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
