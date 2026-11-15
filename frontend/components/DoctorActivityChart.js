'use client';

/**
 * Monthly activity chart: new patients and new doctors on the same axes.
 *
 * Recharts renders on the dark detail surface, so axis/tooltip colours are set
 * explicitly. The container is height-flexible: `ResponsiveContainer` needs a
 * sized parent, and the panel gives it `min-h-0 flex-1` so the chart absorbs the
 * leftover height without introducing page scroll.
 *
 * `months` is [{ label, patients, doctors }]. Per-doctor stats only have one
 * series, so `showDoctors` is opt-in.
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
  return (
    <div className="rounded-lg border border-white/15 bg-[#20242b] px-2.5 py-1.5 text-[11px] shadow-pop">
      <p className="mb-0.5 text-white/55">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-1.5 text-white">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          <span className="text-white/60">
            {entry.dataKey === 'doctors' ? 'Doctors' : 'Patients'}
          </span>
          <span className="ml-auto font-semibold tnum">{entry.value ?? 0}</span>
        </p>
      ))}
    </div>
  );
}

export default function DoctorActivityChart({
  months = [],
  showDoctors = false,
  emptyLabel = 'Nothing added yet',
}) {
  const data = months.map((m) => ({
    label: m.label,
    patients: m.patients ?? m.count ?? 0,
    doctors: m.doctors ?? 0,
  }));
  const total = data.reduce((sum, d) => sum + d.patients + (showDoctors ? d.doctors : 0), 0);

  if (total === 0) {
    return (
      <div className="grid min-h-[96px] flex-1 place-items-center rounded-[11px] border border-dashed border-white/10 text-[11px] text-white/45">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex min-h-[96px] flex-1 flex-col">
      {showDoctors && (
        <div className="mb-1 flex items-center gap-3 text-[10px] text-white/55">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]" aria-hidden />
            Patients
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8aa0b4]" aria-hidden />
            Doctors
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="activity-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="activity-area-doctors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8aa0b4" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#8aa0b4" stopOpacity={0.02} />
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
            {/* Doctors are two orders of magnitude below patients, so each series
                gets its own hidden scale — otherwise the doctors line is flat. */}
            <YAxis yAxisId="patients" hide allowDecimals={false} width={0} />
            {showDoctors && (
              <YAxis yAxisId="doctors" hide allowDecimals={false} width={0} orientation="right" />
            )}
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.22)' }} />

            {showDoctors && (
              <Area
                yAxisId="doctors"
                type="monotone"
                dataKey="doctors"
                stroke="#8aa0b4"
                strokeWidth={1.75}
                fill="url(#activity-area-doctors)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            )}
            <Area
              yAxisId="patients"
              type="monotone"
              dataKey="patients"
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
    </div>
  );
}
