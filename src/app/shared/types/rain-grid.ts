export interface Device {
  guid: string;
  sncode: string;
  alias?: string;
  type?: string;
  lat?: number | null;
  lng?: number | null;
  alt?: number | null;
  gsw?: boolean | null;
  rain?: boolean | null;
  status: number;
  last_time?: number;
  createTime?: number;
  updateTime?: number;
}

export interface SaveDevicePayload {
  guid?: string;
  sncode: string;
  alias?: string;
  type?: string;
  lat?: number | null;
  lng?: number | null;
  alt?: number | null;
  gsw?: boolean;
  rain?: boolean;
  status?: number;
}

export interface Grid {
  guid: string;
  name: string;
  sncodes?: string;
  resolution?: number | string;
  minDevice?: number;
  minDistance?: number;
  status: number;
  createTime?: number;
  updateTime?: number;
}

export interface SaveGridPayload {
  guid?: string;
  name: string;
  sncodes?: string;
  resolution?: number;
  minDevice?: number;
  minDistance?: number;
  status?: number;
}

export interface Predict {
  guid: string;
  baseTime: number;
  time: number;
  sncode: string;
  predictRain: number;
  predictNewRain?: number;
  predictRainLevel: number;
  predictNewRainLevel?: number;
  realRain?: number;
  type: number;
  createTime?: number;
  updateTime?: number;
}

export interface PredictGroup {
  baseTime: number;
  realRain?: number;
  predictList: Predict[];
}

export interface ServiceRuntimeInfo {
  name: string;
  status: string;
  pid: number;
  startedAt: number;
  uptimeSeconds: number;
  workingDir: string;
  executable: string;
  goVersion: string;
  goos: string;
  compiler: string;
  numCpu: number;
  numGoroutine: number;
  allocBytes: number;
  sysBytes: number;
  heapAllocBytes: number;
  heapInuseBytes: number;
  lastGcPauseNano: number;
}

export interface ServerCPUInfo {
  cpus: number[];
  cores: number;
}

export interface ServerRAMInfo {
  usedMb: number;
  usedGb: number;
  totalMb: number;
  totalGb: number;
  usedPercent: number;
}

export interface ServerDiskInfo {
  mountPoint: string;
  usedMb: number;
  usedGb: number;
  totalMb: number;
  totalGb: number;
  usedPercent: number;
}

export interface SystemMonitorInfo {
  service: ServiceRuntimeInfo;
  cpu: ServerCPUInfo;
  ram: ServerRAMInfo;
  disk: ServerDiskInfo[];
  warnings: string[];
  checkedAt: number;
}

export interface MqttMonitorInfo {
  enable: boolean;
  running: boolean;
  host: string;
  port: number;
  address: string;
  handlerCount: number;
  totalMessages: number;
  lastMessageAt: number;
  lastClientId: string;
  lastTopic: string;
  lastPayloadSize: number;
  startedAt: number;
  uptimeSeconds: number;
  warnings: string[];
  checkedAt: number;
}

export interface SystemConfig {
  guid?: string;
  key: string;
  value: string;
}

export interface RainGridSettings {
  mqttEnable: boolean;
  mqttPort: number;
  heartbeatTimeoutMinutes: number;
  gridCron: string;
  excelOutputDir: string;
}
