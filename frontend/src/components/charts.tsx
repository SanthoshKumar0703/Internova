import { useEffect, useId, useState } from "react";

export function ChartCard({ title, sub, right, children, className = "" }: any) {
  return (
    <div className={`bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="font-extrabold text-slate-900 dark:text-cream">{title}</p>
          {sub && <p className="text-xs text-slate-500 dark:text-cream-dim mt-0.5">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function useMounted() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return on;
}

export function VBars({ data, height = 190, color = "#7b39fc" }: { data: { label: string; value: number; color?: string }[]; height?: number; color?: string }) {
  const on = useMounted();
  if (!data.length) return <p className="text-sm text-slate-400 dark:text-cream-dim/70 py-8 text-center">Not enough data yet.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ height }}>
      <div className="flex items-end gap-2" style={{ height: height - 26 }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 h-full flex flex-col items-center justify-end" title={`${d.label}: ${d.value}`}>
            <span className="text-[10px] font-bold text-slate-500 dark:text-cream-dim tabular mb-1">{d.value}</span>
            <div className="w-full max-w-[46px] rounded-t-lg transition-all duration-700 ease-out"
              style={{ height: on ? `${Math.max(3, (d.value / max) * 100)}%` : "3%", background: d.color || color }} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px] font-semibold text-slate-400 dark:text-cream-dim/70 truncate">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export function HBars({ data }: { data: { label: string; value: number; color?: string; hint?: string }[] }) {
  const on = useMounted();
  if (!data.length) return <p className="text-sm text-slate-400 dark:text-cream-dim/70 py-6 text-center">Not enough data yet.</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-cream-dim mb-1 gap-2">
            <span className="truncate">{d.label}</span>
            <span className="tabular shrink-0">{d.hint ?? d.value}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: on ? `${Math.max(2, (d.value / max) * 100)}%` : "2%", background: d.color || "#7b39fc" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Donut({ segments, size = 150, thickness = 18 }: { segments: { label: string; value: number; color: string }[]; size?: number; thickness?: number }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  if (!total) return <p className="text-sm text-slate-400 dark:text-cream-dim/70 py-8 text-center">Not enough data yet.</p>;
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 text-slate-200 dark:text-white/10">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={thickness} />
          {segments.map((s, i) => {
            const frac = s.value / total;
            const off = acc;
            acc += frac;
            return (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
                strokeWidth={thickness} strokeDasharray={`${Math.max(0, frac * C - 1.5)} ${C}`}
                strokeDashoffset={-off * C} strokeLinecap="butt" />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-extrabold tabular text-slate-900 dark:text-cream">{total}</p>
            <p className="text-[10px] font-bold text-slate-400 dark:text-cream-dim/70 uppercase tracking-wide">total</p>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <p key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-cream-dim">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label}<span className="tabular text-slate-400 dark:text-cream-dim/70">· {s.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function Trend({ data, height = 170, color = "#7b39fc" }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const id = useId().replace(/:/g, "");
  if (!data.length) return <p className="text-sm text-slate-400 dark:text-cream-dim/70 py-8 text-center">Not enough data yet.</p>;
  const W = 600, H = 200, P = 30;
  const max = Math.max(1, ...data.map((d) => d.value));
  const pts = data.map((d, i) => {
    const x = data.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (data.length - 1);
    const y = H - P - (d.value / max) * (H - 2 * P);
    return [x, y] as const;
  });
  const line = pts.map((p) => p.join(",")).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height }} className="w-full text-slate-200 dark:text-white/10">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.32" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={P} x2={W - P} y1={H - P - (H - 2 * P) * f} y2={H - P - (H - 2 * P) * f} stroke="currentColor" strokeWidth="1" />
        ))}
        <polygon points={`${P},${H - P} ${line} ${W - P},${H - P}`} fill={`url(#${id})`} />
        <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="4.5" fill="#fff" stroke={color} strokeWidth="2.5">
            <title>{`${data[i].label}: ${data[i].value}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between mt-1 px-1">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] font-semibold text-slate-400 dark:text-cream-dim/70">{d.label}</span>
        ))}
      </div>
    </div>
  );
}
