import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';
import { SettingsService, User } from '@delon/theme';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';

@Component({
  selector: 'header-avatar',
  template: `
    <div
      class="avatar-trigger"
      nz-dropdown
      nzPlacement="bottomRight"
      nzOverlayClassName="header-avatar-dropdown"
      [nzDropdownMenu]="userMenu"
    >
      <nz-avatar
        [nzSrc]="user.avatar || 'assets/avatar.gif'"
        nzSize="default"
        nzShape="circle"
        class="avatar-image"
      />
      <span class="avatar-name">{{ user.name || user['username'] || 'Admin' }}</span>
    </div>
    <nz-dropdown-menu #userMenu="nzDropdownMenu">
      <div nz-menu class="avatar-menu">
        <div nz-menu-item routerLink="/system/account">
          <i nz-icon nzType="user"></i>
          个人中心
        </div>
        <li nz-menu-divider></li>
        <div nz-menu-item (click)="logout()">
          <i nz-icon nzType="logout"></i>
          退出登录
        </div>
      </div>
    </nz-dropdown-menu>
  `,
  styles: [
    `
      .avatar-trigger {
        display: inline-flex;
        gap: 10px;
        align-items: center;
        min-height: 42px;
        padding: 4px 10px 4px 6px;
        border: 1px solid transparent;
        border-radius: 999px;
        color: #1f2a3d;
        cursor: pointer;
        transition:
          border-color 0.2s ease,
          background 0.2s ease,
          transform 0.2s ease;
      }

      .avatar-trigger:hover {
        transform: translateY(-1px);
        border-color: rgb(var(--nm-primary-rgb) / 14%);
        background: rgb(var(--nm-primary-rgb) / 7%);
      }

      .avatar-image {
        flex: 0 0 auto;
        box-shadow: 0 6px 16px rgb(var(--nm-primary-rgb) / 14%);
      }

      .avatar-name {
        max-width: 120px;
        overflow: hidden;
        font-size: 18px;
        font-weight: 850;
        line-height: 1;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .avatar-menu {
        min-width: 168px;
      }

      .avatar-menu [nz-menu-item] {
        display: flex;
        gap: 10px;
        align-items: center;
      }

      :host-context(.nm-theme-dark) .avatar-trigger {
        color: rgb(241 245 249 / 88%);
      }

      :host-context(.nm-theme-dark) .avatar-trigger:hover {
        border-color: rgb(var(--nm-primary-rgb) / 24%);
        background: rgb(var(--nm-primary-rgb) / 12%);
      }

      :host-context(.nm-theme-dark) .avatar-image {
        box-shadow:
          0 8px 18px rgb(0 0 0 / 22%),
          0 0 0 2px rgb(255 255 255 / 6%);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [NzDropdownModule, NzMenuModule, NzIconModule, NzAvatarModule, RouterLink],
})
export class AvatarComponent {
  protected readonly user = inject(SettingsService).user as User & { username?: string };
  private readonly router = inject(Router);
  private readonly tokenService: ITokenService = inject(DA_SERVICE_TOKEN);

  protected logout(): void {
    this.tokenService.clear();
    this.router.navigateByUrl(this.tokenService.login_url!);
  }
}
