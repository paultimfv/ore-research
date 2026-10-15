import data from "@/data/ore.json";
import { TimeChart } from "@/components/charts";
import Spiral from "@/components/spiral";
import ThemeToggle from "@/components/theme-toggle";
import { AddressTable, FlowMap, Kpi, Panel, Section } from "@/components/ui";
import { n0, pct, usd, compact, dayLabel } from "@/lib/fmt";

const T = data.totals;
const L = data.live;
const M = data.last30;

const returned = T.deployedSol - T.vaultedSol - T.adminFeeSol;
const daily = data.daily.slice(0, -1); // today is partial
const weekly = data.weekly.slice(0, -1); // this week is partial

const A = {
  program: "oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv",
  mint: "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp",
  treasury: "45db2FSR4mcXdSVVZbKbwojU6uYDpMyhpEi7cC8nHaWG",
  wsol: "Ef4Bu9FQ8v8yV8HEKKfsb7W9XjYoyvCDhGVNVA3jkLzm",
  admin: "DyB4Kv6V613gp2LWQTq1dwDYHGKuUEoDHnCouGUtxFiX",
  adminOld: "tHCCE3KWKx8i8cDjX2DQ3Z7EMJkScAVwkfxdWz8SqgP",
  stake: "stakecNP3FpiExZPCgZfqRgumVzi6dNqnfrjwXyTgeH",
  mintProgram: "mintzxW6Kckmeyh1h6Zfdj9QcYgCzhPSGiC8ChZ6fCx",
  board: "BrcSxdp1nXFzou1YyDnQJcPNBNHgoypZmTsyKBSLLXzi",
  signer: "HNWhK5f8RMWBqcA7mXJPaxdTPGrha3rrqUrri7HSKb3T",
};
const scan = (a: string) => `https://solscan.io/account/${a}`;
const SRC = {
  rounds: [{ label: "round events via admin fee wallet", href: scan(A.admin) }],
  buybacks: [{ label: "buyback events via treasury wSOL account", href: scan(A.wsol) }],
  price: [{ label: "buyback events", href: scan(A.wsol) }, { label: "Kraken SOL/USD", href: "https://www.kraken.com/prices/solana" }],
};

const ADDRESSES = [
  { name: "ORE program", addr: A.program, role: "Runs rounds and buybacks" },
  { name: "ORE mint", addr: A.mint, role: "ORE token, max supply 3,000,000" },
  { name: "Treasury", addr: A.treasury, role: "Holds protocol SOL until buybacks" },
  { name: "Treasury wSOL account", addr: A.wsol, role: "Source for buyback data" },
  { name: "Admin fee wallet", addr: A.admin, role: "Receives 1% of SOL deployed; source for round data" },
  { name: "Admin fee wallet (before Nov 4, 2025)", addr: A.adminOld, role: "Same, rounds 10,099 to 42,531" },
  { name: "Board", addr: A.board, role: "Current round state" },
  { name: "Stake program", addr: A.stake, role: "Receives 10% of bought-back ORE" },
  { name: "Mint program", addr: A.mintProgram, role: "Mint authority for ORE" },
  { name: "Buyback signer", addr: A.signer, role: "Signs buyback transactions" },
];

function TileGrid({ wins }: { wins: number[] }) {
  const exp = wins.reduce((a, b) => a + b, 0) / wins.length;
  return (
    <div className="grid max-w-[360px] grid-cols-5 gap-1.5">
      {wins.map((w, i) => {
        const dev = w / exp - 1;
        return (
          <div key={i} className="rounded border border-line bg-bg px-1 py-2 text-center" title={`Tile ${i + 1}: ${n0(w)} wins`}>
            <div className="text-[13px] font-semibold text-text">{compact(w, 1)}</div>
            <div className={`text-[11px] ${dev >= 0 ? "text-accent" : "text-muted"}`}>{dev >= 0 ? "+" : ""}{(dev * 100).toFixed(1)}%</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Page() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <header className="flex items-start justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-4">
          <Spiral days={daily.map((d) => ({ d: d.d, deployed: d.deployed }))} size={72} />
          <div>
            <h1 className="text-[26px] font-semibold text-text">ORE</h1>
            <p className="mt-0.5 text-[14px] text-muted">
              Onchain data for <a className="underline" href="https://ore.com" target="_blank" rel="noreferrer">ORE</a> on Solana. Rounds {n0(data.firstRound.id)} to {n0(data.lastRound.id)}, {dayLabel(data.firstRound.date)} to {dayLabel(data.lastRound.date)}.
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Key numbers">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="ORE price" value={`$${(L.priceUsd ?? 0).toFixed(2)}`} note={`${(L.priceSol ?? 0).toFixed(3)} SOL, last buyback`} />
          <Kpi label="Circulating supply" value={n0(L.supply)} note={`${pct(L.supply / L.maxSupply)} of 3M max`} />
          <Kpi label="Staked ORE" value={n0(L.stakedOre)} note={`${pct(L.stakedOre / L.supply)} of supply`} />
          <Kpi label="Treasury SOL" value={n0(L.treasurySol)} note="Awaiting buyback" />
          <Kpi label="SOL deployed, 30d" value={compact(M.deployedSol)} note={usd(M.deployedUsd)} />
          <Kpi label="Protocol revenue, 30d" value={usd(M.vaultedUsd)} note={`${n0(M.vaultedSol)} SOL to treasury`} />
          <Kpi label="ORE minted, 30d" value={n0(M.mintedOre)} note={`${n0(M.buriedOre)} burned`} />
          <Kpi label="Motherlode hits" value={n0(data.motherlodeCount)} note={`${n0(T.motherlodeOre)} ORE paid out`} />
        </div>
      </Section>

      <Section title="Flows" sub={`Totals since round ${n0(data.firstRound.id)}. Click a box to open it on Solscan.`}>
        <FlowMap cols={4} rows={3} ariaLabel="ORE flow from miners through the ORE program to the treasury, buybacks, burning and stakers"
          nodes={[
            { id: "miners", col: 0, row: 0, title: "Miners", sub: "any wallet" },
            { id: "mint", col: 0, row: 2, title: "Mint program", sub: "mints ORE", addr: A.mintProgram, kind: "contract" },
            { id: "ore", col: 1, row: 0, title: "ORE program", sub: "1 round per minute", addr: A.program, kind: "contract" },
            { id: "back", col: 2, row: 0, title: "Returned to miners", sub: `${pct(returned / T.deployedSol)} of SOL`, kind: "outcome" },
            { id: "admin", col: 1, row: 2, title: "Admin fee wallet", sub: `${pct(T.adminFeeSol / T.deployedSol)} of SOL`, addr: A.admin, kind: "wallet" },
            { id: "treasury", col: 2, row: 1, title: "Treasury", sub: `${pct(T.vaultedSol / T.deployedSol)} of SOL`, addr: A.treasury, kind: "contract" },
            { id: "burn", col: 3, row: 0, title: "Burned", sub: "90% of bought ORE", kind: "outcome" },
            { id: "stake", col: 3, row: 2, title: "Stakers", sub: "10% of bought ORE", addr: A.stake, kind: "contract" },
          ]}
          edges={[
            { from: "miners", to: "ore", label: `${compact(T.deployedSol)} SOL` },
            { from: "ore", to: "back", label: `${compact(returned)} SOL` },
            { from: "ore", to: "admin", label: `${compact(T.adminFeeSol)} SOL` },
            { from: "ore", to: "treasury", label: `${compact(T.vaultedSol)} SOL` },
            { from: "treasury", to: "burn", label: `${compact(T.buriedOre)} ORE` },
            { from: "treasury", to: "stake", label: `${compact(T.sharedOre)} ORE` },
            { from: "mint", to: "miners", label: `+${compact(T.mintedOre)} ORE` },
          ]} />
      </Section>

      <Section title="Charts">
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="SOL deployed per day" source={SRC.rounds}>
            <TimeChart rows={daily.map((d) => ({ d: d.d, v: d.deployed }))} unit="SOL"
              series={[{ key: "v", name: "SOL deployed", color: "var(--accent2)", type: "bar" }]} />
          </Panel>
          <Panel title="Average miners per round, per day" source={SRC.rounds}>
            <TimeChart rows={daily.map((d) => ({ d: d.d, v: d.avgMiners }))}
              series={[{ key: "v", name: "Miners per round", color: "var(--accent2)", type: "line" }]} />
          </Panel>
          <Panel title="Protocol revenue per week, USD" sub="SOL sent to the treasury, at the daily SOL/USD close." source={SRC.rounds}>
            <TimeChart rows={weekly.map((w) => ({ d: w.w, v: w.vaultedUsd }))} prefix="$"
              series={[{ key: "v", name: "Revenue", color: "var(--accent)", type: "bar" }]} />
          </Panel>
          <Panel title="Buybacks per week, SOL spent" source={SRC.buybacks}>
            <TimeChart rows={weekly.map((w) => ({ d: w.w, v: w.bbSol }))} unit="SOL"
              series={[{ key: "v", name: "SOL spent", color: "var(--accent)", type: "bar" }]} />
          </Panel>
          <Panel title="ORE minted vs burned per week" source={[...SRC.rounds, ...SRC.buybacks]}>
            <TimeChart rows={weekly.map((w) => ({ d: w.w, minted: w.minted, burned: -w.buried }))} unit="ORE"
              series={[{ key: "minted", name: "Minted", color: "var(--accent)", type: "bar", stack: "s" }, { key: "burned", name: "Burned", color: "var(--bad)", type: "bar", stack: "s" }]} />
          </Panel>
          <Panel title="Circulating supply" sub="Supply reported after each buyback." source={SRC.buybacks}>
            <TimeChart rows={daily.filter((d) => d.supply).map((d) => ({ d: d.d, v: d.supply }))} unit="ORE"
              series={[{ key: "v", name: "Supply", color: "var(--accent)", type: "line" }]} />
          </Panel>
          <Panel title="Buyback price vs treasury SOL per ORE minted, USD" sub="Buyback price: SOL spent ÷ ORE bought. Treasury SOL per ORE minted: SOL to treasury ÷ ORE minted that day." source={SRC.price}>
            <TimeChart rows={daily.filter((d) => d.priceUsd).map((d) => ({ d: d.d, price: d.priceUsd, cost: d.prodCostUsd }))} prefix="$"
              series={[{ key: "price", name: "Buyback price", color: "var(--accent)", type: "line" }, { key: "cost", name: "Treasury SOL per ORE minted", color: "var(--accent2)", type: "line" }]} />
          </Panel>
          <Panel title="Wins per tile" sub={`${n0(T.rounds)} rounds on the 5×5 grid. % vs an even split. Chi-square ${data.squaresChi2} (24 df).`} source={SRC.rounds}>
            <TileGrid wins={data.squares} />
          </Panel>
        </div>
      </Section>

      <Section title="Largest motherlode hits">
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[520px] text-left text-[14px]">
            <thead className="bg-panel text-muted">
              <tr><th className="px-4 py-2 font-normal">Round</th><th className="px-4 py-2 font-normal">Date</th><th className="px-4 py-2 text-right font-normal">ORE</th><th className="px-4 py-2 text-right font-normal">Miners</th><th className="px-4 py-2 text-right font-normal">SOL deployed</th></tr>
            </thead>
            <tbody>
              {data.motherlodes.slice(0, 8).map((m) => (
                <tr key={m.round} className="border-t border-line">
                  <td className="px-4 py-2 text-text">{n0(m.round)}</td>
                  <td className="px-4 py-2 text-muted">{dayLabel(m.date)}</td>
                  <td className="px-4 py-2 text-right text-text">{n0(m.ore)}</td>
                  <td className="px-4 py-2 text-right text-muted">{n0(m.miners)}</td>
                  <td className="px-4 py-2 text-right text-muted">{m.deployed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Contracts and wallets">
        <AddressTable rows={ADDRESSES} />
      </Section>

      <Section title="Data">
        <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-muted">
          <li>Rounds: the ORE program&apos;s reset event, decoded from every transaction to the <a className="underline" href={scan(A.admin)} target="_blank" rel="noreferrer">admin fee wallet</a> (and the <a className="underline" href={scan(A.adminOld)} target="_blank" rel="noreferrer">earlier one</a>). {n0(T.rounds)} rounds, {n0(data.firstRound.id)} to {n0(data.lastRound.id)}. Rounds before {n0(data.firstRound.id)} are not included.</li>
          <li>Buybacks: the ORE program&apos;s bury event, decoded from every transaction to the <a className="underline" href={scan(A.wsol)} target="_blank" rel="noreferrer">treasury wSOL account</a>. {n0(T.buybacks)} buybacks.</li>
          <li>Supply, staked ORE and treasury balance: read from the <a className="underline" href={scan(A.mint)} target="_blank" rel="noreferrer">mint</a>, <a className="underline" href={scan(A.stake)} target="_blank" rel="noreferrer">stake program</a> and <a className="underline" href={scan(A.treasury)} target="_blank" rel="noreferrer">treasury</a> accounts.</li>
          <li>SOL/USD: Kraken daily close. Solana data via Helius RPC. Updated daily.</li>
        </ul>
      </Section>

      <footer className="mt-12 border-t border-line pt-5 text-[13px] text-muted">
        By <a className="underline" href="https://paultimofeev.com">Paul Timofeev</a>. Not affiliated with ORE.
      </footer>
    </main>
  );
}
