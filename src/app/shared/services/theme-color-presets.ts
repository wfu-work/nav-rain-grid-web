export interface ThemeColorPreset {
  key: string;
  label: string;
  primary: string;
  hover: string;
  active: string;
  soft: string;
  tint: string;
  rgb: string;
}

export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  {
    key: 'recodex-blue',
    label: '深海蓝',
    primary: '#3448f4',
    hover: '#4f7dff',
    active: '#2434c9',
    soft: '#eef3ff',
    tint: '#f6f8ff',
    rgb: '52 72 244',
  },
  {
    key: 'sky',
    label: '晴空蓝',
    primary: '#1677ff',
    hover: '#4096ff',
    active: '#0958d9',
    soft: '#eef5ff',
    tint: '#f5f9ff',
    rgb: '22 119 255',
  },
  {
    key: 'bubble',
    label: '气泡蓝',
    primary: '#6fa7ff',
    hover: '#88b7ff',
    active: '#3f75df',
    soft: '#edf5ff',
    tint: '#f7fbff',
    rgb: '111 167 255',
  },
  {
    key: 'violet',
    label: '堇紫',
    primary: '#6f42c1',
    hover: '#8b5cf6',
    active: '#59359a',
    soft: '#f3effc',
    tint: '#faf7ff',
    rgb: '111 66 193',
  },
  {
    key: 'cyan',
    label: '青蓝',
    primary: '#0891b2',
    hover: '#06b6d4',
    active: '#0e7490',
    soft: '#ecfeff',
    tint: '#f3fcfd',
    rgb: '8 145 178',
  },
  {
    key: 'amber',
    label: '琥珀',
    primary: '#c77700',
    hover: '#f59e0b',
    active: '#9a5c00',
    soft: '#fff7e6',
    tint: '#fffaf0',
    rgb: '199 119 0',
  },
];
