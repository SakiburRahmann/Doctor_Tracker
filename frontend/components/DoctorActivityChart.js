'use client';

/**
 * Patients added per month — a compact area chart for the dashboard's detail panel.
 *
 * Recharts renders on the dark detail surface, so the axis/tooltip colours are
 * set explicitly instead of inheriting the light-theme tokens. The container is
 * height-flexible: `ResponsiveContainer` needs a sized parent, and the panel
 * gives it `min-h-0 flex-1` so the chart absorbs whatever height is left over
 * without introducing page scroll.
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value ?? 0;
  return (
    <div className="rounded-lg border border-white/15 bg-[#20242b] px-2.5 py-1.5 text-[11px] shadow-pop">
      <p className="text-white/55">{label}</p>
      <p className="font-semibold text-white tnum">
        {value} patient{value === 1 ? '' : 's'}
      </p>
    </div>
  );
}

export default function DoctorActivityChart({ months = [], emptyLabel = 'No patients added yet' }) {
  const data = months.map((m) => ({ label: m.label, value: m.count ?? 0 }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="grid min-h-[96px] flex-1 place-items-center rounded-[11px] border border-dashed border-white/10 text-[11px] text-white/45">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="min-h-[96px] flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="activity-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.5} />
              <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
            dy={4}
          />
          <YAxis hide allowDecimals={false} width={0} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.22)' }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="rgb(var(--accent))"
            strokeWidth={2}
            fill="url(#activity-area)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
