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
import { Grid } from '@shared/types/rain-grid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

import { GridsService } from '../grids.service';

@Component({
  selector: 'app-grid-list',
  templateUrl: './grid-list.component.html',
  styleUrls: ['./grid-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class GridListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly service = inject(GridsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly q = {
    page: 1,
    size: 10,
    content: '',
    resolution: '',
    status: '',
  };

  protected data: Grid[] = [];
  protected total = 0;
  protected loading = false;

  protected readonly columns: Array<STColumn<Grid>> = [
    { title: '格网', index: 'name', render: 'nameRender', width: 190 },
    { title: '设备号', index: 'sncodes', render: 'sncodesRender', width: 220 },
    { title: '分辨率', index: 'resolution', render: 'resolutionRender', width: 110 },
    { title: '参数', render: 'paramsRender', width: 150 },
    { title: '状态', index: 'status', render: 'statusRender', width: 80 },
    { title: '更新时间', index: 'updateTime', render: 'timeRender', width: 150 },
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
    this.q.resolution = '';
    this.q.status = '';
    this.getData();
  }

  protected create(): void {
    this.router.navigate(['/grids/create']);
  }

  protected edit(item: Grid): void {
    this.router.navigate(['/grids/edit', item.guid], { state: { grid: item } });
  }

  protected remove(item: Grid): void {
    this.modal.confirm({
      nzTitle: '删除格网',
      nzContent: `确定删除「${item.name}」吗？`,
      nzOkDanger: true,
      nzOkText: '删除',
      nzCancelText: '取消',
      nzOnOk: () =>
        this.service.delete(item.guid).subscribe({
          next: () => {
            this.message.success('格网已删除');
            this.getData();
          },
          error: (err) => this.message.error(err?.msg || err?.message || '删除格网失败'),
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
    return status === 1 ? '启用' : '禁用';
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  protected splitSncodes(value?: string): string[] {
    return this.normalizeSncodes(value)
      .split(',')
      .filter((item) => item.length > 0);
  }

  protected firstSncodes(value?: string): string[] {
    return this.splitSncodes(value).slice(0, 3);
  }

  protected sncodeCount(value?: string): number {
    return this.splitSncodes(value).length;
  }

  private normalizeSncodes(value?: string | null): string {
    return (value ?? '')
      .split(/[,，\n\r\s]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .join(',');
  }
}
