import data from "@/data/ore.json";
import Spiral from "@/components/spiral";
import Sankey from "@/components/sankey";
import { ActivityChart, CostVsPrice, RevenueChart, SupplyFlowChart, SupplyLine } from "@/components/charts";
import { ContractDiagram, ContractTable } from "@/components/contract-map";
import { n0, n1, pct, usd, compact, dayLabel } from "@/lib/fmt";

const T = data.totals;
const L = data.live;
const M = data.last30;

const toWinners = T.deployedSol - T.vaultedSol - T.adminFeeSol;
const bought = T.buriedOre + T.sharedOre;
const unswapped = Math.max(T.vaultedSol - T.buybackSol, 0);
const burnShare = T.buriedOre / T.mintedOre;
const priced = data.daily.filter((d) => d.priceSol && d.prodCostSol);
const profitableDays = priced.filter((d) => (d.priceSol as number) > (d.prodCostSol as number)).length;
const last30Priced = priced.slice(-30);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
const cost30 = avg(last30Priced.map((d) => d.prodCostSol as number));
const price30 = avg(last30Priced.map((d) => d.priceSol as number));
const expected = data.squares.reduce((a, b) => a + b, 0) / 25;

const weekly = data.weekly.map((w) => ({ ...w, burnedNeg: -w.buried }));
const daily = data.daily.slice(0, -1); // today is partial

const SECTIONS = [
  ["flow", "Flow"], ["activity", "Activity"], ["revenue", "Revenue"], ["supply", "Supply"],
  ["margin", "Margin"], ["fairness", "Fairness"], ["contracts", "Contracts"], ["method", "Method"],
] as const;

function Exhibit({ id, n, title, children, note, source }: {
  id: string; n: number; title: string; children: React.ReactNode; note?: React.ReactNode; source: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line pt-8 pb-14">
      <div className="grid gap-x-10 gap-y-4 lg:grid-cols-[220px_1fr]">
        <div className="text-[13px] leading-relaxed text-ash">
          <div className="mb-2 text-copper">Exhibit {n}</div>
          {note}
        </div>
        <div className="min-w-0">
          <h2 className="wide mb-6 max-w-[34ch] text-[22px] font-semibold leading-tight text-bone sm:text-[26px]">{title}</h2>
          {children}
          <p className="mt-4 text-[12px] leading-relaxed text-ash">Source: {source}</p>
        </div>
      </div>
    </section>
  );
}

function Fig({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-t border-line py-3">
      <div className="text-[13px] text-ash">{label}</div>
      <div className="wide mt-1 text-[26px] font-semibold leading-none text-bone">{value}</div>
      {sub && <div className="mt-1.5 text-[12.5px] text-ash">{sub}</div>}
    </div>
  );
}

const sol = (a: string) => `https://solscan.io/account/${a}`;

export default function Page() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-4 py-3 sm:px-6">
          <a href="#top" className="wide shrink-0 text-[15px] font-bold tracking-tight text-bone no-underline">ORE <span className="font-normal text-ash">research</span></a>
          <nav className="hidden flex-1 gap-5 text-[13px] text-ash md:flex">
            {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} className="no-underline hover:text-bone">{label}</a>)}
          </nav>
          <div className="ml-auto shrink-0 text-right text-[12px] text-ash">
            Round {n0(L.round)}<span className="hidden sm:inline">, data to {dayLabel(data.lastRound.date)}</span>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <section className="grid items-center gap-8 pt-12 pb-16 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <h1 className="wide-xl text-[40px] font-bold text-bone sm:text-[56px]">
              {compact(T.deployedSol, 2)} SOL deployed on a 5×5 grid, one minute at a time.
            </h1>
            <p className="mt-6 max-w-[58ch] text-[16px] leading-relaxed text-bone/80">
              ORE is mined, not sold. Every minute miners spread SOL across 25 tiles and one tile wins the new ORE.
              Miners get their SOL back minus a 1% fee, and minus 10% more on the losing tiles. That cut is the cost
              of mining, and the protocol spends it buying ORE on the open market and burning it.
              Since round {n0(data.firstRound.id)} the treasury has bought {compact(bought)} ORE and burned {compact(T.buriedOre)},
              about {pct(burnShare, 0)} of everything mined in the same period.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-x-8">
              <Fig label="Buyback price" value={`$${n1(L.priceUsd ?? 0)}`} sub={`${(L.priceSol ?? 0).toFixed(3)} SOL, last buyback`} />
              <Fig label="Circulating supply" value={n0(L.supply)} sub={`${pct(L.supply / L.maxSupply)} of the 3M cap`} />
              <Fig label="SOL deployed, 30d" value={compact(M.deployedSol)} sub={`${usd(M.deployedUsd)} at daily SOL closes`} />
              <Fig label="Staked" value={n0(L.stakedOre)} sub={`${pct(L.stakedOre / L.supply)} of supply`} />
            </div>
          </div>
          <figure className="mx-auto w-full max-w-[560px]">
            <Spiral days={daily.map((d) => ({ d: d.d, deployed: d.deployed }))} />
            <figcaption className="mt-2 text-center text-[12px] text-ash">
              Each tick is one day of mining, {dayLabel(daily[0].d)} at the centre to {dayLabel(daily[daily.length - 1].d)} at the edge.
              Length is SOL deployed that day.
            </figcaption>
          </figure>
        </section>

        <Exhibit id="flow" n={1}
          title={`Of every 100 SOL deployed, ${n1((toWinners / T.deployedSol) * 100)} go back to miners and ${n1((T.vaultedSol / T.deployedSol) * 100)} buy ORE`}
          note={<>A 1% admin fee comes off every tile and a 10% protocol fee off the 24 losing tiles, so miners get back 99% on the winning tile and 89.1% elsewhere. Earlier versions paid the losing tiles&apos; SOL to the winners instead; the protocol&apos;s cut was the same. Bought ORE is split 90% burned, 10% to stakers.</>}
          source={<>ResetEvent in every round&apos;s Reset transaction ({n0(T.rounds)} rounds) and BuryEvent in every buyback ({n0(T.buybacks)}), decoded from the ORE program&apos;s own logs.</>}>
          <div className="mb-2 flex justify-between text-[12px] text-ash"><span>{n0(T.deployedSol)} SOL deployed</span><span>100%</span></div>
          <div className="flex h-9 w-full overflow-hidden rounded-[3px]" role="img"
            aria-label={`Deployed SOL split: ${pct(toWinners / T.deployedSol)} back to miners, ${pct(T.vaultedSol / T.deployedSol)} to the treasury, ${pct(T.adminFeeSol / T.deployedSol)} admin fee`}>
            <div className="flex items-center bg-steel/35 px-3 text-[12.5px] text-bone" style={{ width: pct(toWinners / T.deployedSol, 3) }}>Returned to miners, {pct(toWinners / T.deployedSol)}</div>
            <div className="bg-copper" style={{ width: pct(T.vaultedSol / T.deployedSol, 3) }} />
            <div className="bg-ash/60" style={{ width: pct(T.adminFeeSol / T.deployedSol, 3) }} />
          </div>
          <div className="mt-2 flex justify-end gap-5 text-[12px] text-ash">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-copper" />Treasury {pct(T.vaultedSol / T.deployedSol)}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ash/60" />Admin fee {pct(T.adminFeeSol / T.deployedSol)}</span>
          </div>
          <p className="mt-8 mb-1 text-[13px] text-ash">Following the treasury&apos;s {pct(T.vaultedSol / T.deployedSol)}:</p>
          <div className="-mx-4 overflow-x-auto px-4">
            <Sankey cols={3} height={300} labelW={230} ariaLabel="Sankey diagram of the treasury's SOL: most is swapped for ORE, which is split 90% burned and 10% to stakers; a small remainder is waiting to be swapped"
              nodes={[
                { id: "vault", col: 0, label: "Treasury vault", sub: `${n0(T.vaultedSol)} SOL`, color: "#d4894a" },
                { id: "bb", col: 1, label: "Swapped for ORE", sub: `${n0(T.buybackSol)} SOL → ${n0(bought)} ORE`, color: "#d4894a", order: 0 },
                { id: "wait", col: 1, label: "Not swapped", sub: `${n0(unswapped)} SOL, reserve and pending`, color: "#7c4522", order: 1 },
                { id: "burn", col: 2, label: "Burned", sub: `${n0(T.buriedOre)} ORE`, color: "#e2603a", order: 0 },
                { id: "stk", col: 2, label: "To stakers", sub: `${n0(T.sharedOre)} ORE`, color: "#f0b27a", order: 1 },
              ]}
              links={[
                { from: "vault", to: "bb", value: Math.min(T.buybackSol, T.vaultedSol) },
                { from: "vault", to: "wait", value: unswapped, color: "#7c4522" },
                { from: "bb", to: "burn", value: Math.min(T.buybackSol, T.vaultedSol) * (T.buriedOre / bought), color: "#e2603a" },
                { from: "bb", to: "stk", value: Math.min(T.buybackSol, T.vaultedSol) * (T.sharedOre / bought), color: "#f0b27a" },
              ]} />
          </div>
          <div className="mt-6 grid gap-x-8 sm:grid-cols-3">
            <Fig label="ORE minted to miners" value={n0(T.mintedOre)} sub="1 ORE per round + 0.2 to the motherlode pool" />
            <Fig label="Motherlode jackpots" value={n0(T.motherlodeHits)} sub={`${n0(T.motherlodeOre)} ORE paid out, once every ${n0(T.rounds / T.motherlodeHits)} rounds`} />
            <Fig label="ORE bought back" value={n0(bought)} sub={`${pct(bought / T.mintedOre, 0)} of ORE minted over the same rounds`} />
          </div>
        </Exhibit>

        <Exhibit id="activity" n={2}
          title={`Miners deployed ${compact(M.deployedSol)} SOL in the last 30 days, with about ${M.avgMiners} wallets in each round`}
          note={<>Steel area: SOL deployed per day (left axis). Copper line: average number of distinct wallets per round (right axis). The busiest round so far took {n0(data.topRounds[0].deployed)} SOL from {n0(data.topRounds[0].miners)} miners on {dayLabel(data.topRounds[0].date)}.</>}
          source={<>ResetEvent total_deployed and total_miners per round, summed by UTC day.</>}>
          <ActivityChart rows={daily.map((d) => ({ d: d.d, deployed: d.deployed, avgMiners: d.avgMiners }))} />
        </Exhibit>

        <Exhibit id="revenue" n={3}
          title={`The treasury has taken in ${usd(T.vaultedUsd)}, ${usd(M.vaultedUsd)} of it in the last 30 days`}
          note={<>Revenue here is the SOL the protocol vaults each round, the only thing that funds buybacks. Converted to USD at the Kraken SOL/USD daily close. The 1% admin fee goes to a separate wallet and isn&apos;t included.</>}
          source={<>ResetEvent total_vaulted per round, summed by week. SOL/USD: Kraken daily OHLC.</>}>
          <RevenueChart rows={weekly.map((w) => ({ w: w.w, vaultedUsd: w.vaultedUsd }))} />
        </Exhibit>

        <Exhibit id="supply" n={4}
          title={`Burns have offset ${pct(burnShare, 0)} of new ORE; supply grew ${n0(L.supply - (data.daily.find((d) => d.supply)?.supply ?? L.supply))} since October 2025`}
          note={<>Copper bars: ORE minted to miners each week. Red bars: ORE burned by buybacks. The line below is circulating supply as reported by each buyback&apos;s own event. In the last 30 days {n0(M.mintedOre)} ORE was minted and {n0(M.buriedOre)} burned.</>}
          source={<>ResetEvent total_minted; BuryEvent ore_buried and new_circulating_supply. Current supply read from the mint account.</>}>
          <SupplyFlowChart rows={weekly.map((w) => ({ w: w.w, minted: w.minted, burnedNeg: w.burnedNeg }))} />
          <div className="mt-6">
            <SupplyLine rows={daily.filter((d) => d.supply).map((d) => ({ d: d.d, supply: d.supply }))} />
          </div>
        </Exhibit>

        <Exhibit id="margin" n={5}
          title={`Buybacks paid more than ORE cost to mine on ${profitableDays} of ${priced.length} days`}
          note={<>Copper: buyback price. Steel: cost to mine, ORE&apos;s own production-cost measure: SOL vaulted by the protocol divided by ORE minted, per day. Buyback price is SOL spent divided by ORE received in that day&apos;s swaps. Last 30 days: cost {cost30.toFixed(3)} SOL, price {price30.toFixed(3)} SOL.</>}
          source={<>ResetEvent total_vaulted and total_minted; BuryEvent sol_amount, ore_buried and ore_shared.</>}>
          <CostVsPrice rows={priced.slice(0, -1).map((d) => ({ d: d.d, priceSol: d.priceSol, prodCostSol: d.prodCostSol }))} />
        </Exhibit>

        <Exhibit id="fairness" n={6}
          title="Every tile wins about as often as chance says it should"
          note={<>Each cell counts the rounds that tile won since round {n0(data.firstRound.id)}. With {n0(expected * 25)} rounds the expected count per tile is {n0(expected)}. A chi-tile test gives {data.squaresChi2} on 24 degrees of freedom, below the 36.4 threshold for 5% significance, so the spread is consistent with a fair draw.</>}
          source={<>ResetEvent winning_square, rounds with SOL deployed and valid entropy.</>}>
          <div className="grid gap-8 sm:grid-cols-[minmax(0,420px)_1fr]">
            <div className="grid grid-cols-5 gap-1.5">
              {data.squares.map((w, i) => {
                const dev = (w - expected) / expected;
                return (
                  <div key={i} className="flex aspect-tile flex-col justify-between rounded-[3px] border border-line p-2"
                    style={{ background: `color-mix(in oklab, ${dev >= 0 ? "#d4894a" : "#8ea6be"} ${Math.min(Math.abs(dev) * 900, 60)}%, #131118)` }}
                    title={`Tile ${i + 1}: ${n0(w)} wins (${dev >= 0 ? "+" : ""}${(dev * 100).toFixed(2)}% vs expected)`}>
                    <span className="text-[11px] text-ash">#{i + 1}</span>
                    <span className="wide text-[14px] font-semibold text-bone">{compact(w, 1)}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-[13px] leading-relaxed text-ash">
              <p className="mb-3 text-bone">Biggest motherlode payouts</p>
              <table className="w-full max-w-[380px]">
                <tbody>
                  {data.motherlodes.slice(0, 8).map((m) => (
                    <tr key={m.round} className="border-b border-line/60">
                      <td className="py-1.5">Round {n0(m.round)}</td>
                      <td className="py-1.5 text-ash">{dayLabel(m.date)}</td>
                      <td className="py-1.5 text-right text-copper">{n1(m.ore)} ORE</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3">The motherlode pool grows 0.2 ORE every round and pays out all at once. It holds {n1(L.motherlodePool)} ORE right now. It has hit once every {n0(T.rounds / T.motherlodeHits)} rounds: the odds were 1 in 625 until ORE moved them to 1 in 500.</p>
            </div>
          </div>
        </Exhibit>

        <Exhibit id="contracts" n={7}
          title="One program runs the game; four others mint, randomise, swap and pay stakers"
          note={<>Click any box or address to open it on Solscan. Programs are copper, wallets and token accounts are steel.</>}
          source={<>Program constants in <a href="https://github.com/regolith-labs/ore" className="underline">regolith-labs/ore</a> (api/src/consts.rs), checked against the account lists of live Reset and Buyback transactions.</>}>
          <div className="-mx-4 overflow-x-auto px-4"><ContractDiagram /></div>
          <div className="mt-8"><ContractTable /></div>
        </Exhibit>

        <Exhibit id="method" n={8}
          title="How the numbers are built"
          note={<>Pipeline code and raw data are public. It refreshes daily on GitHub Actions and redeploys this page.</>}
          source={<>Helius RPC (getTransactionsForAddress, getAccountInfo), Kraken for SOL/USD. No Dune, no third-party dashboards.</>}>
          <div className="grid gap-8 text-[14px] leading-relaxed text-bone/85 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold text-bone">Rounds</h3>
              <p>Every Reset transaction pays the 1% admin fee, so the full history of the{" "}
                <a href={sol("DyB4Kv6V613gp2LWQTq1dwDYHGKuUEoDHnCouGUtxFiX")} className="underline">admin fee collector</a> is
                one transaction per round. Each one carries the program&apos;s ResetEvent as a self-call, which gives SOL deployed,
                SOL vaulted, winnings, ORE minted, the winning tile and the miner count. {n0(T.rounds)} rounds, contiguous
                from {n0(data.firstRound.id)} to {n0(data.lastRound.id)}, no gaps.</p>
              <h3 className="mt-5 mb-2 font-semibold text-bone">Buybacks</h3>
              <p>Every buyback wraps SOL in the treasury&apos;s{" "}
                <a href={sol("Ef4Bu9FQ8v8yV8HEKKfsb7W9XjYoyvCDhGVNVA3jkLzm")} className="underline">wSOL account</a> and emits a BuryEvent with
                SOL spent, ORE burned, ORE sent to stakers and the new circulating supply. {n0(T.buybacks)} buybacks.</p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-bone">Checks</h3>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>SOL spent on buybacks ({n0(T.buybackSol)}) is {pct(T.buybackSol / T.vaultedSol)} of SOL vaulted ({n0(T.vaultedSol)}). The gap fits the 1% of revenue ORE says it sends to its Reserve, plus SOL waiting for the next swap.</li>
                <li>Every BuryEvent shares exactly 10% of the bought ORE with stakers, as the program code says.</li>
                <li>Staked ORE read from the stake treasury ({n0(L.stakedOre)}) matches ORE&apos;s own explore page.</li>
                <li>Winning tiles pass a chi-tile uniformity test (Exhibit 6).</li>
              </ul>
              <h3 className="mt-5 mb-2 font-semibold text-bone">Known limits</h3>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Rounds 1 to {n0(data.firstRound.id - 1)} (launch week, before 2 Oct 2025) don&apos;t appear through either fee collector or the board account, so they aren&apos;t counted.</li>
                <li>Older events reported winnings without the winning tile&apos;s own stake, so the admin fee is computed from the code (1% of each tile) rather than as a remainder.</li>
                <li>USD figures use one SOL/USD close per day, not the price at each round.</li>
                <li>Individual Deploy transactions aren&apos;t pulled, so there&apos;s no count of unique miners across rounds.</li>
              </ul>
            </div>
          </div>
        </Exhibit>
      </main>

      <footer className="mx-auto max-w-[1200px] border-t border-line px-4 py-8 text-[12px] leading-relaxed text-ash sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p>Independent research by <a href="https://paultimofeev.com" className="underline">Paul Timofeev</a>. Not affiliated with ORE or Regolith Labs. Not investment advice.</p>
          <p>Built {data.generatedAt.slice(0, 16).replace("T", " ")} UTC. <a href="https://github.com/paultimfv/ore-research" className="underline">Source code</a></p>
        </div>
      </footer>
    </>
  );
}
