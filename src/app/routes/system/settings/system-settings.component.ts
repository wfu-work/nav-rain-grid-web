import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { RainGridSettings } from '@shared/types/rain-grid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

import { DEFAULT_RAIN_GRID_SETTINGS, SystemSettingsService } from '../system-settings.service';

@Component({
  selector: 'app-system-settings',
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class SystemSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SystemSettingsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected saving = false;

  protected readonly form = this.fb.group({
    mqttEnable: [DEFAULT_RAIN_GRID_SETTINGS.mqttEnable],
    mqttPort: [
      DEFAULT_RAIN_GRID_SETTINGS.mqttPort,
      [Validators.required, Validators.min(1), Validators.max(65535)],
    ],
    heartbeatTimeoutMinutes: [
      DEFAULT_RAIN_GRID_SETTINGS.heartbeatTimeoutMinutes,
      [Validators.required, Validators.min(1)],
    ],
    gridCron: [DEFAULT_RAIN_GRID_SETTINGS.gridCron, [Validators.required]],
    excelOutputDir: [DEFAULT_RAIN_GRID_SETTINGS.excelOutputDir, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadSettings();
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
    const payload: RainGridSettings = {
      mqttEnable: value.mqttEnable ?? false,
      mqttPort: Number(value.mqttPort ?? DEFAULT_RAIN_GRID_SETTINGS.mqttPort),
      heartbeatTimeoutMinutes: Number(
        value.heartbeatTimeoutMinutes ?? DEFAULT_RAIN_GRID_SETTINGS.heartbeatTimeoutMinutes,
      ),
      gridCron: (value.gridCron ?? '').trim(),
      excelOutputDir: (value.excelOutputDir ?? '').trim(),
    };
    this.saving = true;
    this.service
      .saveSettings(payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => this.message.success('系统设置已保存'),
        error: (err) => this.message.error(err?.msg || err?.message || '保存系统设置失败'),
      });
  }

  protected resetDefault(): void {
    this.form.reset({ ...DEFAULT_RAIN_GRID_SETTINGS });
  }

  private loadSettings(): void {
    this.loading = true;
    this.service
      .getSettings()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (settings) => this.form.reset(settings),
        error: (err) => this.message.error(err?.msg || err?.message || '读取系统设置失败'),
      });
  }
}
