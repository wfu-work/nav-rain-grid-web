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
import { Device, SaveDevicePayload } from '@shared/types/rain-grid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

import { DevicesService } from '../devices.service';

interface DeviceRouteState {
  device?: Device;
}

@Component({
  selector: 'app-device-edit',
  templateUrl: './device-edit.component.html',
  styleUrls: ['./device-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class DeviceEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected guid = '';
  protected loading = false;
  protected saving = false;
  protected device: Device | null = null;

  protected readonly form = this.fb.group({
    sncode: [{ value: '', disabled: true }, [Validators.required, Validators.maxLength(50)]],
    alias: [''],
    type: [{ value: '北斗降雨', disabled: true }],
    lng: [null as number | null],
    lat: [null as number | null],
    alt: [null as number | null],
    gsw: [false],
    rain: [{ value: true, disabled: true }],
    status: [1, [Validators.required]],
  });

  ngOnInit(): void {
    this.guid = this.route.snapshot.paramMap.get('guid') ?? '';
    const state = globalThis.history.state as DeviceRouteState;
    if (state.device?.guid === this.guid) {
      this.patchForm(state.device);
    }
    if (this.guid) {
      this.loadDevice();
    }
  }

  protected get pageTitle(): string {
    return this.guid ? '编辑设备' : '新建设备';
  }

  protected get pageDescription(): string {
    return this.guid
      ? '维护设备别名、坐标、能力开关和在线状态。'
      : '录入 MQTT 设备基础信息，设备心跳上报后会持续更新最后在线时间。';
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
    const payload: SaveDevicePayload = {
      sncode: this.trim(value.sncode),
      alias: this.trim(value.alias),
      type: this.trim(value.type),
      lng: this.optionalNumber(value.lng),
      lat: this.optionalNumber(value.lat),
      alt: this.optionalNumber(value.alt),
      gsw: value.gsw ?? false,
      rain: value.rain ?? false,
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
          this.message.success(this.guid ? '设备已更新' : '设备已创建');
          this.back();
        },
        error: (err) => this.message.error(err?.msg || err?.message || '保存设备失败'),
      });
  }

  protected back(): void {
    this.router.navigate(['/devices/list']);
  }

  private loadDevice(): void {
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
        next: (device) => this.patchForm(device),
        error: (err) => this.message.error(err?.msg || err?.message || '读取设备失败'),
      });
  }

  private patchForm(device: Device): void {
    this.device = device;
    this.form.reset({
      sncode: device.sncode ?? '',
      alias: device.alias ?? '',
      type: device.type || '北斗降雨',
      lng: device.lng ?? null,
      lat: device.lat ?? null,
      alt: device.alt ?? null,
      gsw: device.gsw ?? false,
      rain: true,
      status: device.status ?? 0,
    });
  }

  private trim(value?: string | null): string {
    return (value ?? '').trim();
  }

  private optionalNumber(value?: number | null): number | null {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
    return Number(value);
  }
}
