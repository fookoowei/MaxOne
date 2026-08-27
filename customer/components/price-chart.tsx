'use client';

import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { buildLineData } from '@/lib/chart/line-data';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface ChartData {
  points: number[];
  labels: string[];
}

const RANGES = [
  { label: '24h', days: 1 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
];

export function PriceChart({ id, initial }: { id: string; initial: ChartData }) {
  const [data, setData] = useState(initial);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  async function select(nextDays: number) {
    if (nextDays === days) return;
    setDays(nextDays);
    setBusy(true);
    const res = await fetch(`/api/markets/${id}/chart?days=${nextDays}`);
    setBusy(false);
    if (res.ok) setData((await res.json()) as ChartData);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            type="button"
            onClick={() => select(r.days)}
            className={`rounded-full px-3 py-1 text-xs ${
              days === r.days
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {data.points.length > 0 ? (
        <div className={busy ? 'opacity-50' : ''}>
          <Line
            data={buildLineData(data.points, data.labels)}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
            }}
          />
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">Chart unavailable.</p>
      )}
    </div>
  );
}
