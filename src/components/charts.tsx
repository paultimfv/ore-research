"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const C = { copper: "#d4894a", copperHi: "#f0b27a", steel: "#8ea6be", burn: "#e2603a", ash: "#8d8693", line: "#2a2630", bone: "#ece6dc" };
const axis = { stroke: C.ash, fontSize: 11, tickLine: false, axisLine: false } as const;

const mlabel = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
const dlabel = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const k = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${Math.round(v)}`);

// show a tick on the first day of every other month
const monthTicks = (rows: Row[], every = 2) => {
  const firsts = rows.map((r) => String(r.d)).filter((d) => d.endsWith("-01"));
  return firsts.filter((_, i) => i % every === 0);
};

type Row = Record<string, number | string | null>;

function Tip({ active, payload, label, items }: {
  active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string;
  items: { key: string; name: string; color: string; fmt: (v: number) => string }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[3px] border border-line bg-raise px-3 py-2 text-[12px] shadow-xl">
      <div className="mb-1 text-ash">{label && /^\d{4}-\d{2}-\d{2}$/.test(label) ? dlabel(label) : label}</div>
      {items.map((it) => {
        const p = payload.find((x) => x.dataKey === it.key);
        if (!p || p.value == null) return null;
        return (
          <div key={it.key} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full" style={{ background: it.color }} />{it.name}</span>
            <span className="font-medium text-bone">{it.fmt(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

// Exhibit: SOL deployed per day (area) with the average number of miners per round (line)
export function ActivityChart({ rows }: { rows: Row[] }) {
  const items = [
    { key: "deployed", name: "SOL deployed", color: C.steel, fmt: (v: number) => `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} SOL` },
    { key: "avgMiners", name: "Avg miners / round", color: C.copper, fmt: (v: number) => `${v}` },
  ];
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gSteel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.steel} stopOpacity={0.45} />
            <stop offset="100%" stopColor={C.steel} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="d" {...axis} ticks={monthTicks(rows)} tickFormatter={mlabel} />
        <YAxis yAxisId="l" {...axis} tickFormatter={k} width={44} />
        <YAxis yAxisId="r" orientation="right" {...axis} width={36} />
        <Tooltip content={<Tip items={items} />} cursor={{ stroke: C.ash, strokeOpacity: 0.4 }} />
        <Area yAxisId="l" dataKey="deployed" stroke={C.steel} strokeWidth={1.4} fill="url(#gSteel)" isAnimationActive={false} />
        <Line yAxisId="r" dataKey="avgMiners" stroke={C.copper} strokeWidth={1.4} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Exhibit: ORE minted vs ORE burned per week; net issuance is the gap
export function SupplyFlowChart({ rows }: { rows: Row[] }) {
  const items = [
    { key: "minted", name: "Minted", color: C.copper, fmt: (v: number) => `+${Math.round(v).toLocaleString("en-US")} ORE` },
    { key: "burnedNeg", name: "Burned", color: C.burn, fmt: (v: number) => `${Math.round(v).toLocaleString("en-US")} ORE` },
  ];
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} stackOffset="sign" margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={1}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="w" {...axis} tickFormatter={mlabel} minTickGap={40} />
        <YAxis {...axis} tickFormatter={k} width={44} />
        <ReferenceLine y={0} stroke={C.ash} strokeOpacity={0.6} />
        <Tooltip content={<Tip items={items} />} cursor={{ fill: C.bone, fillOpacity: 0.04 }} />
        <Bar dataKey="minted" stackId="s" fill={C.copper} isAnimationActive={false} />
        <Bar dataKey="burnedNeg" stackId="s" fill={C.burn} fillOpacity={0.85} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Exhibit: circulating supply (from each buyback's own BuryEvent)
export function SupplyLine({ rows }: { rows: Row[] }) {
  const items = [{ key: "supply", name: "Circulating", color: C.copper, fmt: (v: number) => `${Math.round(v).toLocaleString("en-US")} ORE` }];
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gCopper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.copper} stopOpacity={0.35} />
            <stop offset="100%" stopColor={C.copper} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="d" {...axis} ticks={monthTicks(rows)} tickFormatter={mlabel} />
        <YAxis {...axis} tickFormatter={k} width={44} domain={["dataMin - 10000", "dataMax + 10000"]} />
        <Tooltip content={<Tip items={items} />} cursor={{ stroke: C.ash, strokeOpacity: 0.4 }} />
        <Area dataKey="supply" stroke={C.copper} strokeWidth={1.5} fill="url(#gCopper)" isAnimationActive={false} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Exhibit: what one ORE costs to mine vs what the buyback paid for it, both in SOL
export function CostVsPrice({ rows }: { rows: Row[] }) {
  const items = [
    { key: "priceSol", name: "Buyback price", color: C.copper, fmt: (v: number) => `${v.toFixed(3)} SOL` },
    { key: "prodCostSol", name: "Cost to mine", color: C.steel, fmt: (v: number) => `${v.toFixed(3)} SOL` },
  ];
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="d" {...axis} ticks={monthTicks(rows)} tickFormatter={mlabel} />
        <YAxis {...axis} width={44} scale="log" domain={[0.02, 8]} allowDataOverflow ticks={[0.03, 0.1, 0.3, 1, 3]} tickFormatter={(v) => `${v}`} />
        <Tooltip content={<Tip items={items} />} cursor={{ stroke: C.ash, strokeOpacity: 0.4 }} />
        <Line dataKey="prodCostSol" stroke={C.steel} strokeWidth={1.3} dot={false} isAnimationActive={false} connectNulls />
        <Line dataKey="priceSol" stroke={C.copper} strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Exhibit: protocol revenue, SOL sent to the vault per week, in USD
export function RevenueChart({ rows }: { rows: Row[] }) {
  const items = [
    { key: "vaultedUsd", name: "Vaulted (USD)", color: C.copper, fmt: (v: number) => `$${Math.round(v).toLocaleString("en-US")}` },
  ];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={1}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="w" {...axis} tickFormatter={mlabel} minTickGap={40} />
        <YAxis {...axis} tickFormatter={(v) => `$${k(v)}`} width={48} />
        <Tooltip content={<Tip items={items} />} cursor={{ fill: C.bone, fillOpacity: 0.04 }} />
        <Bar dataKey="vaultedUsd" fill={C.copper} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
