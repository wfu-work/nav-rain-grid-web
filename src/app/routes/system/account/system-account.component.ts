import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { SettingsService, User } from '@delon/theme';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin, switchMap } from 'rxjs';

import { SystemAccountProfile, SystemAccountService } from './system-account.service';

@Component({
  selector: 'app-system-account',
  templateUrl: './system-account.component.html',
  styleUrls: ['./system-account.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class SystemAccountComponent implements OnInit {
  private readonly accountService = inject(SystemAccountService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly settingsService = inject(SettingsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected profile?: SystemAccountProfile;
  protected loading = false;
  protected saving = false;

  protected readonly form = this.fb.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.accountService
      .profile()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (profile) => {
          this.profile = this.normalizeProfile(profile);
          this.syncHeaderUser(this.profile);
        },
        error: (err) => this.message.error(err?.msg || err?.message || '账号资料加载失败'),
      });
  }

  protected savePassword(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    const value = this.form.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
      this.message.error('两次输入的新密码不一致');
      return;
    }

    this.saving = true;
    forkJoin({
      oldPassword: this.accountService.encryptSecret(value.oldPassword),
      newPassword: this.accountService.encryptSecret(value.newPassword),
    })
      .pipe(
        switchMap((payload) => this.accountService.changePassword(payload)),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('密码已更新，下次登录请使用新密码');
          this.form.reset();
          this.load();
        },
        error: (err) =>
          this.message.error(err?.msg || err?.message || '密码更新失败，请检查当前密码是否正确'),
      });
  }

  protected displayName(): string {
    return this.profile?.nickName || this.profile?.name || this.profile?.username || '管理员';
  }

  protected avatarSrc(): string {
    return this.profile?.avatar || 'assets/avatar.gif';
  }

  protected roleText(): string {
    const roles = this.profile?.roleCodeList ?? [];
    return roles.length > 0 ? roles.join(' / ') : 'ADMIN';
  }

  protected statusText(status: number | undefined): string {
    if (status === undefined) return '未知';
    return status === 1 ? '启用' : '禁用';
  }

  protected isEnabled(): boolean {
    return this.profile?.status === 1;
  }

  protected formatTime(value: number | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const pad = (num: number): string => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  protected passwordStrength(): number {
    const value = this.form.controls.newPassword.value;
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  }

  protected passwordStrengthText(): string {
    const value = this.form.controls.newPassword.value;
    if (!value) return '等待输入';
    const score = this.passwordStrength();
    if (score <= 1) return '偏弱';
    if (score <= 3) return '中等';
    return '较强';
  }

  protected isWeakPassword(): boolean {
    return Boolean(this.form.controls.newPassword.value) && this.passwordStrength() <= 1;
  }

  protected isMediumPassword(): boolean {
    const score = this.passwordStrength();
    return Boolean(this.form.controls.newPassword.value) && score > 1 && score <= 3;
  }

  protected isStrongPassword(): boolean {
    return Boolean(this.form.controls.newPassword.value) && this.passwordStrength() > 3;
  }

  private normalizeProfile(profile: SystemAccountProfile): SystemAccountProfile {
    return {
      ...profile,
      username: profile.username || profile.name || profile.nickName || '管理员',
      status: this.firstNumber(profile.status, profile.enable),
      createTime: this.firstNumber(profile.createTime, profile.create_time),
      updateTime: this.firstNumber(profile.updateTime, profile.update_time),
    };
  }

  private syncHeaderUser(profile: SystemAccountProfile): void {
    const current = this.settingsService.user as User & {
      username?: string;
      roleCodeList?: string[];
    };
    this.settingsService.setUser({
      ...current,
      name: profile.nickName || profile.name || profile.username || current.name || 'Admin',
      avatar: profile.avatar || current.avatar || 'assets/avatar.gif',
      username: profile.username || current.username,
      roleCodeList: profile.roleCodeList || current.roleCodeList || ['ADMIN'],
    });
  }

  private firstNumber(...values: Array<number | undefined>): number | undefined {
    return values.find((value) => value !== undefined && value !== null);
  }
}
