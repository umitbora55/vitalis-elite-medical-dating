import React, { useMemo } from 'react';
import type { TrendPoint } from '../../services/analyticsService';

interface TrendChartProps {
  data: TrendPoint[];
  label: string;
  color?: string;     // Tailwind stroke color class, e.g. 'stroke-gold-400'
  fillColor?: string; // Tailwind fill class e.g. 'fill-gold-400/10'
  height?: number;
  loading?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  label,
  color = 'stroke-gold-400',
  fillColor = 'fill-gold-400/10',
  height = 80,
  loading = false,
}) => {
  const WIDTH  = 320;
  const HEIGHT = height;
  const PAD    = 4;

  const { points, pathD, fillD, minVal, maxVal } = useMemo(() => {
    if (!data.length) return { points: [], pathD: '', fillD: '', minVal: 0, maxVal: 0 };

    const values = data.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range  = maxVal - minVal || 1;
    const step   = (WIDTH - PAD * 2) / (data.length - 1 || 1);

    const pts = data.map((d, i) => ({
      x: PAD + i * step,
      y: PAD + (1 - (d.value - minVal) / range) * (HEIGHT - PAD * 2),
      value: d.value,
      date: d.date,
    }));

    const lineSegments = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaSegments = [
      `M ${pts[0]?.x ?? 0} ${HEIGHT}`,
      ...pts.map((p) => `L ${p.x} ${p.y}`),
      `L ${pts[pts.length - 1]?.x ?? 0} ${HEIGHT}`,
      'Z',
    ].join(' ');

    return { points: pts, pathD: lineSegments, fillD: areaSegments, minVal, maxVal };
  }, [data, WIDTH, HEIGHT]);

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div
          className="w-full rounded-xl bg-slate-800 animate-pulse"
          style={{ height: `${height}px` }}
        />
      </div>
    );
  }

  if (!data.length || (minVal === 0 && maxVal === 0)) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <div
          className="w-full rounded-xl bg-slate-800/40 border border-slate-700/30 flex items-center justify-center"
          style={{ height: `${height}px` }}
        >
          <p className="text-xs text-slate-600">Veri yok</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <span className="text-xs text-slate-400 font-semibold">
          {data[data.length - 1]?.value ?? 0}
        </span>
      </div>

      <div className="relative w-full" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {/* Fill area */}
          <path d={fillD} className={fillColor} />

          {/* Line */}
          <path
            d={pathD}
            className={color}
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Last point dot */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1]?.x ?? 0}
              cy={points[points.length - 1]?.y ?? 0}
              r="3"
              className={`${color.replace('stroke-', 'fill-')}`}
            />
          )}
        </svg>
      </div>

      {/* X-axis labels (first, mid, last) */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-600">{data[0]?.date?.slice(5) ?? ''}</span>
        <span className="text-[10px] text-slate-600">
          {data[Math.floor(data.length / 2)]?.date?.slice(5) ?? ''}
        </span>
        <span className="text-[10px] text-slate-600">{data[data.length - 1]?.date?.slice(5) ?? ''}</span>
      </div>
    </div>
  );
};
