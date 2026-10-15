// Every day of mining as one radial tick on an Archimedean spiral, oldest at the centre.
// Tick length is that day's SOL deployed; brightness follows the share of it that went to the vault.

type Day = { d: string; deployed: number };

export default function Spiral({ days, size = 560 }: { days: Day[]; size?: number }) {
  const c = size / 2;
  const turns = Math.max(days.length / 120, 2.6);
  const r0 = size * 0.07;
  const r1 = size * 0.4;
  const max = Math.max(...days.map((d) => d.deployed));
  const ticks = days.map((day, i) => {
    const t = i / Math.max(days.length - 1, 1);
    const ang = t * turns * Math.PI * 2 - Math.PI / 2;
    const r = r0 + (r1 - r0) * t;
    const len = 2 + Math.sqrt(day.deployed / max) * size * 0.085;
    const x1 = c + Math.cos(ang) * r;
    const y1 = c + Math.sin(ang) * r;
    const x2 = c + Math.cos(ang) * (r + len);
    const y2 = c + Math.sin(ang) * (r + len);
    return { x1, y1, x2, y2, len, t, i, day };
  });
  const firstOfMonth = ticks.filter((k) => k.day.d.endsWith("-01"));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full" role="img"
      aria-label={`Daily SOL deployed into ORE mining, ${days.length} days, drawn as a spiral from ${days[0]?.d} at the centre to ${days[days.length - 1]?.d} at the edge`}>
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d4894a" stopOpacity="0.16" />
          <stop offset="70%" stopColor="#d4894a" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#d4894a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r={c} fill="url(#glow)" />
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle key={f} cx={c} cy={c} r={r0 + (r1 - r0) * f + size * 0.05} fill="none" stroke="#2a2630" strokeWidth={0.6} strokeDasharray="1 4" />
      ))}
      {ticks.map((k) => (
        <line key={k.i} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2}
          stroke={k.t > 0.985 ? "#f0b27a" : "#d4894a"}
          strokeOpacity={0.35 + 0.65 * k.t} strokeWidth={1.1} strokeLinecap="round"
          className="spiral-tick" style={{ ["--len" as string]: k.len, ["--delay" as string]: `${k.t * 0.9}s` }} />
      ))}
      {firstOfMonth.filter((_, j) => j % 3 === 0).map((k) => {
        const ang = Math.atan2(k.y1 - c, k.x1 - c);
        const rr = Math.hypot(k.x1 - c, k.y1 - c) - 9;
        return (
          <text key={k.day.d} x={c + Math.cos(ang) * rr} y={c + Math.sin(ang) * rr} fill="#8d8693" fontSize={9.5}
            textAnchor="middle" dominantBaseline="middle">
            {new Date(k.day.d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })}
          </text>
        );
      })}
      <circle cx={c} cy={c} r={r0 * 0.5} fill="none" stroke="#d4894a" strokeOpacity={0.6} strokeWidth={1} />
      <circle cx={c} cy={c} r={2.5} fill="#ece6dc" />
    </svg>
  );
}
