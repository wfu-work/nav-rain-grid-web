import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'logo',
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      role="img"
      aria-label="降雨格网 logo"
    >
      <defs>
        <linearGradient
          id="rainGridDrop"
          x1="278"
          y1="120"
          x2="750"
          y2="882"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stop-color="#37a2ff" />
          <stop offset=".52" stop-color="var(--nm-primary)" />
          <stop offset="1" stop-color="#1662d8" />
        </linearGradient>
        <linearGradient
          id="rainGridLine"
          x1="278"
          y1="710"
          x2="752"
          y2="250"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stop-color="#10b981" />
          <stop offset="1" stop-color="#67e8f9" />
        </linearGradient>
        <linearGradient
          id="rainGridHighlight"
          x1="350"
          y1="180"
          x2="624"
          y2="550"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stop-color="#ffffff" stop-opacity=".84" />
          <stop offset="1" stop-color="#ffffff" stop-opacity=".1" />
        </linearGradient>
        <filter
          id="rainGridSoftShadow"
          x="-18%"
          y="-18%"
          width="136%"
          height="136%"
          color-interpolation-filters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="24"
            stdDeviation="22"
            flood-color="#1458c8"
            flood-opacity=".22"
          />
        </filter>
      </defs>

      <g filter="url(#rainGridSoftShadow)">
        <path
          d="M512 76C392 224 276 370 276 536c0 156 108 292 236 292s236-136 236-292C748 370 632 224 512 76Z"
          fill="url(#rainGridDrop)"
        />
        <path
          d="M395 252c-40 66-74 134-74 217 0 42 10 84 28 122"
          fill="none"
          stroke="url(#rainGridHighlight)"
          stroke-width="34"
          stroke-linecap="round"
        />

        <path
          d="M378 374h268M338 486h348M356 598h312M512 262v448M408 332c-28 120-28 252 0 372M616 332c28 120 28 252 0 372"
          fill="none"
          stroke="#ffffff"
          stroke-width="22"
          stroke-linecap="round"
          stroke-opacity=".74"
        />

        <path
          d="M350 662 512 530l162 132M350 662h324"
          fill="none"
          stroke="url(#rainGridLine)"
          stroke-width="42"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="350" cy="662" r="34" fill="#d9fff4" />
        <circle cx="512" cy="530" r="42" fill="#ffffff" />
        <circle cx="674" cy="662" r="34" fill="#d9fff4" />
        <circle cx="512" cy="530" r="16" fill="#0f8f69" />
      </g>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: 0 0 auto;
        aspect-ratio: 1;
      }

      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {}
