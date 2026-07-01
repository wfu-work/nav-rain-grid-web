import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { ECharts, EChartsCoreOption } from 'echarts';
import * as echarts from 'echarts';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { DatePickerComponent } from '@shared/components/date-picker/date-picker.component';
import { Device, Predict, PredictGroup } from '@shared/types/rain-grid';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

import { DevicesService } from '../../devices/devices.service';
import { RainfallService } from '../rainfall.service';
import { AppearanceSettingsService } from '../../../shared/services/appearance-settings.service';

interface RainSeriesConfig {
  name: string;
  key: string;
  leadHour: number;
  field: 'predict' | 'real';
  color: string;
}

interface ChartRow {
  time: number;
  [key: string]: number | null;
}

@Component({
  selector: 'app-predict-chart',
  templateUrl: './predict-chart.component.html',
  styleUrls: ['./predict-chart.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, DatePickerComponent],
})
export class PredictChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartRef', { static: false }) chartRef?: ElementRef<HTMLDivElement>;

  private readonly rainfallService = inject(RainfallService);
  private readonly devicesService = inject(DevicesService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly appearance = inject(AppearanceSettingsService);

  protected readonly q = {
    sncode: '',
    dateRange: [
      Date.now() - 7 * 24 * 60 * 60 * 1000,
      Date.now() + 24 * 60 * 60 * 1000,
    ] as number[],
  };

  protected devices: Device[] = [];
  protected deviceLoading = false;
  protected loading = false;
  protected isEmpty = false;
  protected chartRows: ChartRow[] = [];
  protected rawData: PredictGroup[] = [];

  private chart?: ECharts;
  private resizeObserver?: ResizeObserver;

  private readonly rainSeriesConfigs: RainSeriesConfig[] = [
    { name: '1小时预测降雨量', key: 'predictRain1h', leadHour: 1, field: 'predict', color: '#3448f4' },
    { name: '12小时预测降雨量', key: 'predictRain12h', leadHour: 12, field: 'predict', color: '#d89000' },
    { name: '24小时预测降雨量', key: 'predictRain24h', leadHour: 24, field: 'predict', color: '#2f9c95' },
  ];

  constructor() {
    effect(() => {
      this.appearance.resolvedTheme();
      this.renderChart();
    });
  }

  ngOnInit(): void {
    this.loadDevices();
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.bindResize();
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  protected loadDevices(): void {
    this.deviceLoading = true;
    this.devicesService
      .listAll()
      .pipe(
        finalize(() => {
          this.deviceLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (devices) => {
          this.devices = devices ?? [];
          this.q.sncode = this.devices[0]?.sncode ?? '';
          this.getData();
        },
        error: (err) => {
          this.message.error(err?.msg || err?.message || '设备列表加载失败');
          this.getData();
        },
      });
  }

  protected getData(): void {
    this.loading = true;
    const isDark = this.appearance.resolvedTheme() === 'dark';
    this.chart?.showLoading({
      text: '加载中...',
      color: '#3448f4',
      textColor: isDark ? 'rgba(241,245,249,0.86)' : '#1f2a3d',
      maskColor: isDark ? 'rgba(8,15,29,0.72)' : 'rgba(255,255,255,0.72)',
    });
    this.rainfallService
      .predictQuery({
        sncode: this.q.sncode,
        startTime: this.toTimestamp(this.q.dateRange[0]),
        endTime: this.toTimestamp(this.q.dateRange[1]),
      })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.chart?.hideLoading();
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (data) => {
          this.rawData = data ?? [];
          this.chartRows = this.buildChartData(this.rawData);
          this.isEmpty = this.chartRows.length === 0;
          this.renderChart();
        },
        error: (err) => {
          this.isEmpty = true;
          this.chartRows = [];
          this.chart?.clear();
          this.message.error(err?.msg || err?.message || '图表数据加载失败');
        },
      });
  }

  protected resetQuery(): void {
    this.q.sncode = this.devices[0]?.sncode ?? '';
    this.q.dateRange = [
      Date.now() - 7 * 24 * 60 * 60 * 1000,
      Date.now() + 24 * 60 * 60 * 1000,
    ];
    this.getData();
  }

  protected deviceOptionLabel(device: Device): string {
    if (!device.alias) return device.sncode;
    return `${device.sncode} · ${device.alias}`;
  }

  protected pointCount(): number {
    return this.chartRows.length;
  }

  protected maxRainText(): string {
    const values = this.chartRows
      .flatMap((row) => this.rainSeriesConfigs.map((series) => row[series.key]))
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (values.length === 0) return '0.00';
    return Math.max(...values).toFixed(2);
  }

  protected latestBaseTimeText(): string {
    const latest = this.chartRows.at(-1)?.time;
    return latest ? this.formatTime(latest) : '-';
  }

  private initChart(): void {
    const element = this.chartRef?.nativeElement;
    if (!element || this.chart) return;
    this.chart = echarts.init(element);
  }

  private bindResize(): void {
    const element = this.chartRef?.nativeElement;
    if (!element) return;
    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(element);
  }

  private renderChart(): void {
    if (!this.chartRef?.nativeElement) return;
    this.initChart();
    if (!this.chart) return;
    if (this.chartRows.length === 0) {
      this.chart.clear();
      return;
    }
    this.chart.setOption(this.buildOptions(), true);
    this.chart.resize();
  }

  private buildOptions(): EChartsCoreOption {
    const max = Math.max(Number(this.maxRainText()), 10);
    const isDark = this.appearance.resolvedTheme() === 'dark';
    const textColor = isDark ? 'rgba(248,250,252,0.96)' : '#1f2a3d';
    const mutedColor = isDark ? 'rgba(226,232,240,0.78)' : '#667085';
    const borderColor = isDark ? 'rgba(148,163,184,0.26)' : '#dce5ff';
    const splitLineColor = isDark ? 'rgba(148,163,184,0.18)' : '#eef2ff';
    return {
      backgroundColor: isDark ? 'transparent' : '#fff',
      color: this.rainSeriesConfigs.map((item) => item.color),
      animationDuration: 520,
      animationEasing: 'cubicOut',
      title: {
        text: `${this.q.sncode || '设备'} 雨量预测图形显示`,
        left: 'center',
        top: 8,
        textStyle: {
          color: textColor,
          fontSize: 18,
          fontWeight: 850,
        },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => this.tooltipFormatter(params),
        backgroundColor: isDark ? 'rgba(15,27,46,0.98)' : 'rgba(255,255,255,0.98)',
        borderColor: isDark ? 'rgba(148,163,184,0.28)' : 'rgba(52,72,244,0.12)',
        borderWidth: 1,
        textStyle: { color: textColor },
        padding: [10, 12],
        extraCssText: isDark
          ? 'box-shadow: 0 18px 36px rgba(0,0,0,0.32); border-radius: 12px;'
          : 'box-shadow: 0 14px 30px rgba(24,36,111,0.12); border-radius: 12px;',
        axisPointer: {
          type: 'line',
          lineStyle: { color: isDark ? 'rgba(79,125,255,0.28)' : 'rgba(52,72,244,0.2)' },
        },
      },
      legend: {
        top: 44,
        type: 'scroll',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 16,
        textStyle: { color: mutedColor, fontWeight: 700 },
        data: this.rainSeriesConfigs.map((item) => item.name),
      },
      toolbox: {
        right: 18,
        top: 10,
        iconStyle: {
          borderColor: mutedColor,
        },
        emphasis: {
          iconStyle: {
            borderColor: textColor,
          },
        },
        feature: {
          dataView: { show: true, readOnly: false, title: '数据视图' },
          magicType: { show: true, type: ['line', 'bar'], title: { line: '切换折线图', bar: '切换柱状图' } },
          restore: { show: true, title: '还原' },
          saveAsImage: { show: true, title: '保存为图片' },
        },
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: 18,
          height: 18,
          brushSelect: false,
          filterMode: 'none',
          borderColor,
          fillerColor: isDark ? 'rgba(79,125,255,0.18)' : 'rgba(52,72,244,0.14)',
          handleStyle: {
            borderColor: isDark ? 'rgba(148,163,184,0.36)' : '#dce5ff',
            color: isDark ? '#1e293b' : '#fff',
          },
          textStyle: { color: mutedColor },
        },
      ],
      grid: {
        left: 28,
        right: 32,
        top: 112,
        bottom: 62,
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        boundaryGap: ['2%', '2%'],
        splitLine: { show: false },
        axisLabel: {
          color: mutedColor,
          margin: 18,
          rotate: 36,
          formatter: (value: number) => {
            const [date, time] = this.formatTime(value).split(' ');
            return `${date}\n${time}`;
          },
        },
        axisLine: { lineStyle: { color: borderColor } },
      },
      yAxis: {
        type: 'value',
        name: '降雨量/mm',
        max: Math.ceil(max * 1.12 * 100) / 100,
        min: 0,
        minInterval: 1,
        nameTextStyle: {
          color: mutedColor,
          fontWeight: 700,
        },
        axisLabel: {
          color: mutedColor,
          formatter: (value: number) => Number(value).toFixed(2),
        },
        axisLine: { show: true, lineStyle: { color: borderColor } },
        splitLine: { lineStyle: { color: splitLineColor } },
      },
      series: this.rainSeriesConfigs.map((series) => ({
        name: series.name,
        type: 'bar',
        barMaxWidth: 12,
        barGap: '12%',
        barCategoryGap: '38%',
        data: this.chartRows.map((row) => ({
          name: this.formatTime(row.time),
          value: [row.time, row[series.key]],
        })),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        markPoint: {
          label: {
            color: isDark ? '#ffffff' : '#1f2a3d',
            fontWeight: 800,
          },
          itemStyle: {
            borderColor: isDark ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.8)',
            borderWidth: 1,
          },
          data: [{ type: 'max', name: '最大值' }],
        },
      })),
    };
  }

  private tooltipFormatter(params: unknown): string {
    const items = Array.isArray(params) ? params : [params];
    let html = '';
    items.forEach((item, index) => {
      const param = item as {
        color?: string;
        seriesName?: string;
        name?: string;
        value?: unknown;
      };
      const value = Array.isArray(param.value) ? param.value[1] : param.value;
      if (index === 0) {
        const time = Array.isArray(param.value) ? param.value[0] : param.name;
        html += `<strong>基准时间：${this.formatTimeValue(time)}</strong><br/>`;
      }
      if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
        return;
      }
      html += `<div style="margin-top:4px;text-align:left;"><span style="margin-right:6px;display:inline-block;width:10px;height:10px;border-radius:5px;background:${param.color};"></span>${param.seriesName}：${Number(value).toFixed(4)} mm</div>`;
    });
    return html;
  }

  private buildChartData(data: PredictGroup[]): ChartRow[] {
    const timeMap = new Map<number, ChartRow>();
    data.forEach((group) => {
      const baseTime = this.toTimestamp(group.baseTime);
      if (!baseTime) return;
      const row = timeMap.get(baseTime) ?? { time: baseTime };
      group.predictList?.forEach((predict, index) => {
        const leadHour = this.getLeadHour(baseTime, this.toTimestamp(predict.time), predict, index);
        if (!leadHour) return;
        const predictConfig = this.rainSeriesConfigs.find(
          (series) => series.leadHour === leadHour && series.field === 'predict',
        );
        if (predictConfig) {
          row[predictConfig.key] = this.toRainValue(predict.predictNewRain ?? predict.predictRain);
        }
      });
      timeMap.set(baseTime, row);
    });
    return Array.from(timeMap.values()).sort((prev, next) => prev.time - next.time);
  }

  private getLeadHour(
    baseTime: number | undefined,
    time: number | undefined,
    predict: Predict,
    index: number,
  ): number | undefined {
    if ([1, 12, 24].includes(Number(predict.type))) return Number(predict.type);
    if (baseTime && time) {
      const diffHour = (time - baseTime) / (60 * 60 * 1000);
      const roundedHour = Math.round(diffHour);
      if ([1, 12, 24].includes(roundedHour) && Math.abs(diffHour - roundedHour) < 0.25) {
        return roundedHour;
      }
    }
    const indexLeadHour = index + 1;
    return [1, 12, 24].includes(indexLeadHour) ? indexLeadHour : undefined;
  }

  private toRainValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? Number(numberValue.toFixed(4)) : null;
  }

  private toTimestamp(value?: number | string | Date): number | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.getTime();
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : undefined;
  }

  private formatTimeValue(value: unknown): string {
    if (value instanceof Date) return this.formatTime(value.getTime());
    if (typeof value === 'number' || typeof value === 'string') {
      const timestamp = this.toTimestamp(value);
      return timestamp ? this.formatTime(timestamp) : '-';
    }
    return '-';
  }

  private formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const pad = (num: number): string => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
