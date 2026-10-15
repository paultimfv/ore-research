import data from "@/data/ore.json";
import { TimeChart } from "@/components/charts";
import { AddressTable, FlowMap, Kpi, Panel, Section, Steps } from "@/components/ui";
import { n0, pct, usd, compact, dayLabel } from "@/lib/fmt";

const T = data.totals;
const L = data.live;
const M = data.last30;

const returned = T.deployedSol - T.vaultedSol - T.adminFeeSol;
const bought = T.buriedOre + T.sharedOre;
const daily = data.daily.slice(0, -1); // today is partial

const ADDRESSES = [
  { name: "ORE program", addr: "oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv", role: "Runs every round and every buyback" },
  { name: "ORE token (mint)", addr: "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp", role: "The ORE token. Max supply 3,000,000" },
  { name: "Treasury", addr: "45db2FSR4mcXdSVVZbKbwojU6uYDpMyhpEi7cC8nHaWG", role: "Holds the protocol's SOL cut until it's spent on buybacks" },
  { name: "Treasury wSOL account", addr: "Ef4Bu9FQ8v8yV8HEKKfsb7W9XjYoyvCDhGVNVA3jkLzm", role: "SOL is wrapped here right before each buyback" },
  { name: "Admin fee wallet", addr: "DyB4Kv6V613gp2LWQTq1dwDYHGKuUEoDHnCouGUtxFiX", role: "Receives the 1% admin fee from every round" },
  { name: "Stake program", addr: "stakecNP3FpiExZPCgZfqRgumVzi6dNqnfrjwXyTgeH", role: "Stakers receive 10% of all bought-back ORE" },
  { name: "Mint program", addr: "mintzxW6Kckmeyh1h6Zfdj9QcYgCzhPSGiC8ChZ6fCx", role: "The only thing allowed to create new ORE" },
  { name: "Buyback signer", addr: "HNWhK5f8RMWBqcA7mXJPaxdTPGrha3rrqUrri7HSKb3T", role: "The only wallet allowed to trigger buybacks" },
];

export default function Page() {
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-5">
        <div>
          <h1 className="text-[26px] font-semibold text-text">ORE dashboard</h1>
          <p className="mt-1 text-[14.5px] text-muted">A Solana mining game: miners deploy SOL each minute, the protocol keeps a fee and uses it to buy back and burn ORE.</p>
        </div>
        <p className="text-[13px] text-muted">Data through {dayLabel(data.lastRound.date)}</p>
      </header>

      <Section title="Key numbers">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi label="ORE price" value={`$${(L.priceUsd ?? 0).toFixed(2)}`} note={`${(L.priceSol ?? 0).toFixed(3)} SOL, the price the last buyback paid`} />
          <Kpi label="Circulating supply" value={n0(L.supply)} note={`${pct(L.supply / L.maxSupply)} of the 3M max`} />
          <Kpi label="Staked" value={n0(L.stakedOre)} note={`${pct(L.stakedOre / L.supply)} of circulating supply`} />
          <Kpi label="Protocol revenue, last 30 days" value={usd(M.vaultedUsd)} note={`${n0(M.vaultedSol)} SOL, all of it goes to buybacks`} />
          <Kpi label="ORE burned vs minted, last 30 days" value={`${compact(M.buriedOre)} / ${compact(M.mintedOre)}`} note={`Burns cancelled ${pct(M.buriedOre / M.mintedOre, 0)} of new ORE`} />
          <Kpi label="SOL deployed, last 30 days" value={compact(M.deployedSol)} note={`${usd(M.deployedUsd)}, about ${M.avgMiners} miners per round`} />
        </div>
      </Section>

      <Section title="How the money flows" sub={`Totals since round ${n0(data.firstRound.id)} (${dayLabel(data.firstRound.date)}). Solid boxes are contracts and wallets (click to open on Solscan); dashed boxes are where the money ends up.`}>
        <FlowMap cols={4} rows={3} ariaLabel="ORE money flow from miners through the ORE program to the treasury, buybacks, burning and stakers"
          nodes={[
            { id: "miners", col: 0, row: 0, title: "Miners", sub: "any wallet" },
            { id: "mint", col: 0, row: 2, title: "Mint program", sub: "creates new ORE", addr: "mintzxW6Kckmeyh1h6Zfdj9QcYgCzhPSGiC8ChZ6fCx", kind: "contract" },
            { id: "ore", col: 1, row: 0, title: "ORE program", sub: "one round per minute", addr: "oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv", kind: "contract" },
            { id: "back", col: 2, row: 0, title: "Back to miners", sub: `${pct(returned / T.deployedSol)} of SOL`, kind: "outcome" },
            { id: "admin", col: 1, row: 2, title: "Admin fee wallet", sub: "1% of SOL", addr: "DyB4Kv6V613gp2LWQTq1dwDYHGKuUEoDHnCouGUtxFiX", kind: "wallet" },
            { id: "treasury", col: 2, row: 1, title: "Treasury", sub: `${pct(T.vaultedSol / T.deployedSol)} of SOL`, addr: "45db2FSR4mcXdSVVZbKbwojU6uYDpMyhpEi7cC8nHaWG", kind: "contract" },
            { id: "burn", col: 3, row: 0, title: "Burned", sub: "90% of bought ORE", kind: "outcome" },
            { id: "stake", col: 3, row: 2, title: "Stakers", sub: "10% of bought ORE", addr: "stakecNP3FpiExZPCgZfqRgumVzi6dNqnfrjwXyTgeH", kind: "contract" },
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
        <Steps items={[
          <>Each minute, miners put SOL on a 5×5 grid of tiles. {compact(T.deployedSol, 2)} SOL so far, across {n0(T.rounds)} rounds.</>,
          <>One tile wins. Miners get their SOL back minus fees: 1% on every tile, plus 10% on the losing tiles. That&apos;s {pct(returned / T.deployedSol)} returned overall.</>,
          <>The 10% goes to the treasury: {n0(T.vaultedSol)} SOL, about {usd(T.vaultedUsd)}. The 1% goes to the admin fee wallet.</>,
          <>The treasury spends that SOL buying ORE on Jupiter: {n0(T.buybackSol)} SOL bought {n0(bought)} ORE across {n0(T.buybacks)} buybacks.</>,
          <>90% of bought ORE is burned ({n0(T.buriedOre)}) and 10% goes to stakers ({n0(T.sharedOre)}).</>,
          <>Separately, the mint program creates 1.2 new ORE per round for the winning tile&apos;s miners: {n0(T.mintedOre)} ORE so far.</>,
        ]} />
      </Section>

      <Section title="Charts">
        <div className="grid gap-4">
          <Panel title="SOL deployed per day" sub="How much SOL miners put into the game each day. More SOL means more protocol revenue.">
            <TimeChart rows={daily.map((d) => ({ d: d.d, deployed: d.deployed }))} unit="SOL"
              series={[{ key: "deployed", name: "SOL deployed", color: "var(--accent2)", type: "bar" }]} />
          </Panel>
          <Panel title="ORE created vs ORE burned, per week" sub="Above zero: new ORE minted to miners. Below zero: ORE burned by buybacks. When the bars are the same size, supply stays flat.">
            <TimeChart rows={data.weekly.slice(0, -1).map((w) => ({ d: w.w, minted: w.minted, burned: -w.buried }))} unit="ORE"
              series={[{ key: "minted", name: "Minted", color: "var(--accent)", type: "bar", stack: "s" }, { key: "burned", name: "Burned", color: "var(--bad)", type: "bar", stack: "s" }]} />
          </Panel>
          <Panel title="ORE price, USD" sub="The average price the protocol's own buybacks paid each day (SOL spent ÷ ORE received), converted at that day's SOL price.">
            <TimeChart rows={daily.filter((d) => d.priceUsd).map((d) => ({ d: d.d, price: d.priceUsd }))} prefix="$"
              series={[{ key: "price", name: "Buyback price", color: "var(--accent)", type: "line" }]} />
          </Panel>
        </div>
      </Section>

      <Section title="Contracts and wallets" sub="Every address the numbers above are read from.">
        <AddressTable rows={ADDRESSES} />
      </Section>

      <Section title="How this is measured">
        <details className="rounded-lg border border-line bg-panel p-4 text-[14px] leading-relaxed text-muted">
          <summary className="text-text">Sources, checks and limits</summary>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Every round: the admin fee wallet receives exactly one transaction per round, and each one contains the ORE program&apos;s own round summary (SOL deployed, SOL kept, ORE minted, winning tile). {n0(T.rounds)} rounds, no gaps.</li>
            <li>Every buyback: each one passes through the treasury&apos;s wSOL account and logs SOL spent, ORE burned and ORE sent to stakers. {n0(T.buybacks)} buybacks.</li>
            <li>Live numbers (supply, staked, treasury) are read from the accounts directly. SOL/USD is the Kraken daily close.</li>
            <li>Checks: buybacks spent {pct(T.buybackSol / T.vaultedSol)} of the SOL the treasury collected; stakers got exactly 10% of every buyback; staked ORE matches ore.com; winning tiles are evenly spread (chi-square {data.squaresChi2} vs 36.4 threshold).</li>
            <li>Not counted: rounds 1 to {n0(data.firstRound.id - 1)} (launch week, before 2 Oct 2025), which aren&apos;t visible through either fee wallet.</li>
            <li>Data from Helius RPC. No Dune. Refreshed daily.</li>
          </ul>
        </details>
      </Section>

      <footer className="mt-12 border-t border-line pt-5 text-[13px] text-muted">
        By <a className="underline" href="https://paultimofeev.com">Paul Timofeev</a>. Independent, not affiliated with ORE. Not investment advice.
      </footer>
    </main>
  );
}
