import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { STChange, STColumn } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { Device } from '@shared/types/rain-grid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

import { DevicesService } from '../devices.service';

@Component({
  selector: 'app-device-list',
  templateUrl: './device-list.component.html',
  styleUrls: ['./device-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class DeviceListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly service = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly q = {
    page: 1,
    size: 10,
    content: '',
    type: '',
    status: '',
    gsw: '',
    rain: '',
  };

  protected data: Device[] = [];
  protected total = 0;
  protected loading = false;

  protected readonly columns: Array<STColumn<Device>> = [
    { title: '设备', index: 'sncode', render: 'deviceRender', width: 180 },
    { title: '坐标', render: 'locationRender', width: 190 },
    { title: '类型', index: 'type', render: 'typeRender', width: 90 },
    { title: '能力', render: 'capabilityRender', width: 130 },
    { title: '状态', index: 'status', render: 'statusRender', width: 80 },
    { title: '最后心跳', index: 'last_time', render: 'heartbeatRender', width: 150 },
    { title: '操作', render: 'actionsRender', width: 130 },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    this.service
      .list(this.q)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((res) => {
        this.data = res.data ?? [];
        this.total = res.total ?? 0;
        this.q.page = res.page || this.q.page;
        this.q.size = res.size || this.q.size;
      });
  }

  protected search(): void {
    this.q.page = 1;
    this.getData();
  }

  protected resetQuery(): void {
    this.q.page = 1;
    this.q.content = '';
    this.q.type = '';
    this.q.status = '';
    this.q.gsw = '';
    this.q.rain = '';
    this.getData();
  }

  protected create(): void {
    this.router.navigate(['/devices/create']);
  }

  protected edit(item: Device): void {
    this.router.navigate(['/devices/edit', item.guid], { state: { device: item } });
  }

  protected remove(item: Device): void {
    this.modal.confirm({
      nzTitle: '删除设备',
      nzContent: `确定删除「${item.alias || item.sncode}」吗？`,
      nzOkDanger: true,
      nzOkText: '删除',
      nzCancelText: '取消',
      nzOnOk: () =>
        this.service.delete(item.guid).subscribe({
          next: () => {
            this.message.success('设备已删除');
            this.getData();
          },
          error: (err) => this.message.error(err?.msg || err?.message || '删除设备失败'),
        }),
    });
  }

  protected tableChange(event: STChange): void {
    switch (event.type) {
      case 'pi':
      case 'ps':
      case 'filter':
      case 'sort':
        this.q.page = event.pi;
        this.q.size = event.ps;
        this.getData();
        break;
      default:
        break;
    }
  }

  protected statusLabel(status: number): string {
    return status === 1 ? '在线' : '离线';
  }

  protected capabilityLabel(value?: boolean | null): string {
    return value ? '已开启' : '未开启';
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  protected coordinateText(value?: number | null, precision = 6): string {
    if (value === null || value === undefined) return '-';
    return Number(value).toFixed(precision);
  }
}
