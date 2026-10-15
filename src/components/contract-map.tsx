// ORE contract map: who calls what, and which accounts hold the money.
import { short } from "@/lib/fmt";

export type Entry = { name: string; addr: string; kind: "program" | "account" | "wallet" | "mint"; role: string };

const sol = (a: string) => `https://solscan.io/account/${a}`;

type Box = { id: string; x: number; y: number; w: number; h: number; title: string; addr: string; kind: Entry["kind"]; lines?: string[] };

const BOXES: Box[] = [
  { id: "miners", x: 20, y: 40, w: 190, h: 64, title: "Miners", addr: "", kind: "wallet", lines: ["any wallet, or an autominer"] },
  { id: "crank", x: 20, y: 160, w: 190, h: 64, title: "Reset crank", addr: "", kind: "wallet", lines: ["permissionless, once a minute"] },
  { id: "bury", x: 20, y: 280, w: 190, h: 64, title: "Bury authority", addr: "HNWhK5f8RMWBqcA7mXJPaxdTPGrha3rrqUrri7HSKb3T", kind: "wallet" },
  { id: "ore", x: 330, y: 120, w: 250, h: 170, title: "ORE program", addr: "oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv", kind: "program",
    lines: ["Board: current round", "Round PDAs: 25 tiles each", "Miner PDAs: per-wallet state", "Treasury: vaulted SOL, unclaimed ORE"] },
  { id: "mint", x: 700, y: 20, w: 270, h: 58, title: "ORE mint program", addr: "mintzxW6Kckmeyh1h6Zfdj9QcYgCzhPSGiC8ChZ6fCx", kind: "program" },
  { id: "entropy", x: 700, y: 108, w: 270, h: 58, title: "Entropy program", addr: "3jSkUuYBoJzQPMEzTvkDFXCZUBksPamrVhrnHR9igu2X", kind: "program" },
  { id: "jup", x: 700, y: 196, w: 270, h: 58, title: "Jupiter v6", addr: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", kind: "program" },
  { id: "stake", x: 700, y: 284, w: 270, h: 58, title: "ORE stake program", addr: "stakecNP3FpiExZPCgZfqRgumVzi6dNqnfrjwXyTgeH", kind: "program" },
  { id: "fee", x: 330, y: 330, w: 250, h: 50, title: "Admin fee collector", addr: "DyB4Kv6V613gp2LWQTq1dwDYHGKuUEoDHnCouGUtxFiX", kind: "wallet" },
];

const EDGES: { from: string; to: string; label: string; fy?: number; ty?: number }[] = [
  { from: "miners", to: "ore", label: "deploy SOL", fy: 0.5, ty: 0.12 },
  { from: "crank", to: "ore", label: "reset", fy: 0.5, ty: 0.45 },
  { from: "bury", to: "ore", label: "buyback", fy: 0.5, ty: 0.85 },
  { from: "ore", to: "mint", label: "mint 1.2 ORE / round", fy: 0.08, ty: 0.5 },
  { from: "ore", to: "entropy", label: "winning tile", fy: 0.32, ty: 0.5 },
  { from: "ore", to: "jup", label: "swap SOL to ORE", fy: 0.62, ty: 0.5 },
  { from: "ore", to: "stake", label: "10% of bought ORE", fy: 0.9, ty: 0.5 },
];

export function ContractDiagram() {
  const by = Object.fromEntries(BOXES.map((b) => [b.id, b]));
  return (
    <svg viewBox="0 0 990 400" className="h-auto w-full min-w-[720px]" role="img"
      aria-label="ORE contract map: miners, the reset crank and the bury authority call the ORE program, which calls the mint, entropy, Jupiter and stake programs and pays the admin fee collector">
      <defs>
        <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#8d8693" />
        </marker>
      </defs>
      {EDGES.map((e) => {
        const a = by[e.from], b = by[e.to];
        const x0 = a.x + a.w, y0 = a.y + a.h * (e.fy ?? 0.5);
        const x1 = b.x, y1 = b.y + b.h * (e.ty ?? 0.5);
        const mx = (x0 + x1) / 2;
        return (
          <g key={e.from + e.to}>
            <path d={`M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1 - 2},${y1}`} fill="none" stroke="#8d8693" strokeOpacity={0.7} strokeWidth={1} markerEnd="url(#arr)" />
            <text x={mx} y={(y0 + y1) / 2 - 6} fill="#8d8693" fontSize={10.5} textAnchor="middle"
              style={{ paintOrder: "stroke", stroke: "#0b0a0e", strokeWidth: 4 }}>{e.label}</text>
          </g>
        );
      })}
      <path d={`M455,290 L455,328`} stroke="#8d8693" strokeOpacity={0.7} markerEnd="url(#arr)" />
      <text x={463} y={312} fill="#8d8693" fontSize={10.5}>1% of every tile</text>
      {BOXES.map((b) => (
        <a key={b.id} href={b.addr ? sol(b.addr) : undefined} target="_blank" rel="noreferrer">
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={b.kind === "program" ? "#1b1820" : "#131118"}
            stroke={b.id === "ore" ? "#d4894a" : "#2a2630"} strokeWidth={b.id === "ore" ? 1.4 : 1} />
          <text x={b.x + 12} y={b.y + 22} fill="#ece6dc" fontSize={13} fontWeight={600}>{b.title}</text>
          {b.addr && <text x={b.x + 12} y={b.y + 40} fill={b.kind === "program" ? "#d4894a" : "#8ea6be"} fontSize={11}>{short(b.addr)}</text>}
          {b.lines?.map((l, i) => (
            <text key={l} x={b.x + 12} y={b.y + (b.addr ? 64 : 42) + i * 22} fill="#8d8693" fontSize={11.5}>{l}</text>
          ))}
        </a>
      ))}
    </svg>
  );
}

export const ENTRIES: Entry[] = [
  { name: "ORE program", addr: "oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv", kind: "program", role: "Rounds, rewards, buybacks. Emits Reset and Bury events." },
  { name: "ORE mint", addr: "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp", kind: "mint", role: "Token, 11 decimals, 3,000,000 max supply" },
  { name: "ORE mint program", addr: "mintzxW6Kckmeyh1h6Zfdj9QcYgCzhPSGiC8ChZ6fCx", kind: "program", role: "Only minter; enforces the supply cap" },
  { name: "ORE stake program", addr: "stakecNP3FpiExZPCgZfqRgumVzi6dNqnfrjwXyTgeH", kind: "program", role: "Receives 10% of bought-back ORE as staker yield" },
  { name: "Entropy program", addr: "3jSkUuYBoJzQPMEzTvkDFXCZUBksPamrVhrnHR9igu2X", kind: "program", role: "Supplies the randomness that picks the winning tile" },
  { name: "Board", addr: "BrcSxdp1nXFzou1YyDnQJcPNBNHgoypZmTsyKBSLLXzi", kind: "account", role: "Current round id and slot window" },
  { name: "Treasury", addr: "45db2FSR4mcXdSVVZbKbwojU6uYDpMyhpEi7cC8nHaWG", kind: "account", role: "Holds vaulted SOL and miners' unclaimed SOL" },
  { name: "Treasury wSOL", addr: "Ef4Bu9FQ8v8yV8HEKKfsb7W9XjYoyvCDhGVNVA3jkLzm", kind: "account", role: "SOL wrapped here right before each buyback swap" },
  { name: "Treasury ORE", addr: "GwZS8yBuPPkPgY4uh7eEhHN5EEdpkf7EBZ1za6nuP3wF", kind: "account", role: "Unclaimed mining rewards; bought ORE passes through here to be burned" },
  { name: "Stake treasury", addr: "F3ajpARUkbMnYsrbAmgnsjyp991DVbGYRzfaVXy1Dfvu", kind: "account", role: "Tracks total ORE staked" },
  { name: "Config", addr: "9c9X7aDRAF41faiDs94ELjT19UrGnn72wBW9hPsS4Awy", kind: "account", role: "Fee rates, round length, entropy source" },
  { name: "Admin fee collector", addr: "DyB4Kv6V613gp2LWQTq1dwDYHGKuUEoDHnCouGUtxFiX", kind: "wallet", role: "Gets 1% of every tile; in every Reset tx since round 42,531" },
  { name: "Admin fee collector (old)", addr: "tHCCE3KWKx8i8cDjX2DQ3Z7EMJkScAVwkfxdWz8SqgP", kind: "wallet", role: "Same role, rounds 10,099 to 42,530" },
  { name: "Bury authority", addr: "HNWhK5f8RMWBqcA7mXJPaxdTPGrha3rrqUrri7HSKb3T", kind: "wallet", role: "Only signer allowed to run buybacks" },
];

export function ContractTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead className="text-ash">
          <tr className="border-b border-line">
            <th className="py-2 pr-4 font-normal">Name</th>
            <th className="py-2 pr-4 font-normal">Address</th>
            <th className="py-2 font-normal">What it does</th>
          </tr>
        </thead>
        <tbody>
          {ENTRIES.map((e) => (
            <tr key={e.addr} className="border-b border-line/60 align-top">
              <td className="py-2 pr-4 whitespace-nowrap">{e.name}</td>
              <td className="py-2 pr-4">
                <a href={sol(e.addr)} target="_blank" rel="noreferrer" className={`underline ${e.kind === "program" || e.kind === "mint" ? "text-copper" : "text-steel"}`}>{short(e.addr)}</a>
              </td>
              <td className="py-2 text-ash">{e.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
