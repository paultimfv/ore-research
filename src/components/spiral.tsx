// Small brand mark: every day of mining as one tick on a spiral, oldest at the centre.
// Tick length is that day's SOL deployed.

type Day = { d: string; deployed: number };

export default function Spiral({ days, size = 150 }: { days: Day[]; size?: number }) {
  const c = size / 2;
  const turns = Math.max(days.length / 120, 2.6);
  const r0 = size * 0.08, r1 = size * 0.38;
  const max = Math.max(...days.map((d) => d.deployed), 1);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img"
      aria-label={`SOL deployed per day, ${days.length} days, drawn as a spiral from the centre outward`}>
      {days.map((day, i) => {
        const t = i / Math.max(days.length - 1, 1);
        const ang = t * turns * Math.PI * 2 - Math.PI / 2;
        const r = r0 + (r1 - r0) * t;
        const len = 1 + Math.sqrt(day.deployed / max) * size * 0.09;
        return (
          <line key={i} x1={c + Math.cos(ang) * r} y1={c + Math.sin(ang) * r} x2={c + Math.cos(ang) * (r + len)} y2={c + Math.sin(ang) * (r + len)}
            stroke="var(--accent)" strokeOpacity={0.3 + 0.7 * t} strokeWidth={0.8} strokeLinecap="round" />
        );
      })}
    </svg>
  );
}
