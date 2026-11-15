'use client';

/**
 * Condition distribution as a donut, with the legend beside it.
 *
 * The panel surface is dark in both themes, so the slice colours are fixed
 * values rather than theme tokens (an SVG slice cannot inherit a Tailwind class).
 */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = {
  Critical: '#e2665c',
  Serious: '#e0a24a',
  Stable: '#98ff0c',
  Recovering: '#7bd3a0',
  Chronic: '#8aa0b4',
  'Under Observation': '#5f6b7a',
};

function DonutTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const slice = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/15 bg-[#20242b] px-2.5 py-1.5 text-[11px] shadow-pop">
      <p className="text-white/55">{slice.condition}</p>
      <p className="font-semibold text-white tnum">
        {slice.count} patient{slice.count === 1 ? '' : 's'}
      </p>
    </div>
  );
}

export default function ConditionDonut({ data = [] }) {
  const slices = data.filter((d) => d.count > 0);
  const total = slices.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="grid min-h-[96px] flex-1 place-items-center rounded-[11px] border border-dashed border-white/10 text-[11px] text-white/45">
        No patients on record yet
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 items-center gap-3">
      <div className="relative h-[104px] w-[104px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="condition"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.condition} fill={COLORS[slice.condition] || '#8aa0b4'} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="text-[15px] font-semibold leading-none text-white tnum">{total}</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1">
        {slices.slice(0, 4).map((slice) => (
          <li key={slice.condition} className="flex items-center gap-1.5 text-[10.5px] text-white/65">
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: COLORS[slice.condition] || '#8aa0b4' }}
              aria-hidden
            />
            <span className="min-w-0 truncate">{slice.condition}</span>
            <span className="ml-auto shrink-0 font-semibold text-white tnum">{slice.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
