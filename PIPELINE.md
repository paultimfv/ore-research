# ORE dashboard: how the data works

## The one-paragraph version

ORE is a mining game on Solana. Every minute, miners spread SOL across a 5×5 grid and one tile wins the
newly minted ORE. Miners get their SOL back minus fees (1% admin on every tile, 10% protocol on the losing
tiles), and the protocol spends its cut buying ORE on the open market: 90% of what it buys is burned, 10%
goes to stakers. This dashboard rebuilds every round and every buyback from the ORE program's own event logs,
so the revenue, burn and supply numbers come straight from the chain.

## The picture

```
 SOURCES                                   PIPELINE (Python, daily on GitHub)         DASHBOARD (Next.js on Vercel)

 Helius getTransactionsForAddress
   admin fee collector (1 tx per round) ─► pull_rounds.py ─► data/raw/rounds/YYYY-MM.csv ┐
   treasury wSOL account (every buyback)─► pull_buybacks.py ─► data/raw/buybacks.csv     ├► build_ore.py ─► src/data/ore.json
 Helius getAccountInfo (supply, treasury, stake, board) ────────────────────────────────┤
 Kraken SOL/USD daily close ────────────────────────────────────────────────────────────┘
```

## Rounds

Every Reset transaction pays the 1% admin fee, so the full history of the admin fee collector is exactly one
transaction per round. Inside each one, the ORE program logs a `ResetEvent` by calling its own `Log`
instruction (ix 8). The event is a fixed struct (`api/src/event.rs` in regolith-labs/ore):

| field | used for |
|---|---|
| round_id, ts | timeline, gap check |
| total_deployed | SOL deployed |
| total_vaulted | protocol revenue (10% of losing tiles) |
| total_winnings | not used for fees (older events left out the winning tile's own stake) |
| total_minted | ORE emitted (1 + 0.2 motherlode per round) |
| motherlode | jackpot payouts |
| winning_square, total_miners, top_miner | fairness test, activity |

The collector changed once, at round 42,531 (2025-11-04): `tHCCE3…` before, `DyB4Kv…` after.
Result: 431,095 rounds, contiguous from 10,099 to today with no gaps.

## Buybacks

Each buyback wraps SOL in the treasury's wSOL account (`Ef4Bu9…`), swaps it on Jupiter, and logs a
`BuryEvent` with SOL spent, ORE burned, ORE shared with stakers and the new circulating supply.

## Rules

1. Admin fee = 1% of each tile's SOL (the program's `calculate_fees`), not a remainder.
2. Production cost = SOL vaulted ÷ ORE minted, per day (ORE's own definition).
3. Buyback price = SOL spent ÷ ORE received, per day.
4. USD = SOL × Kraken SOL/USD daily close.

## Checks

- Buyback SOL is 98.2% of vaulted SOL. The gap fits the 1% of revenue ORE says goes to its Reserve, plus
  SOL waiting for the next swap.
- Every BuryEvent shares exactly 10% with stakers, matching the program code.
- Staked ORE from the stake treasury account matches ORE's explore page.
- Winning tiles: χ² = 32 on 24 degrees of freedom (5% threshold 36.4), consistent with a fair draw.
- Motherlode hit once every 591 rounds: ORE says the odds moved from 1 in 625 to 1 in 500.

## Known limits

- Rounds 1 to 10,098 (launch week, before 2 Oct 2025) don't show up through either fee collector or the
  board account and aren't counted.
- Individual Deploy transactions aren't pulled, so there's no unique-miner count across rounds.
- USD uses one daily SOL close.
- ORE Reserve liquidity positions also bury ORE. A probe of the stake treasury account found no BuryEvents
  without a SOL swap so far; if they show up, they need a separate source.

## Running it

```
cd scripts
python pull_rounds.py      # incremental: finished months are marked .done and skipped
python pull_buybacks.py    # incremental from the last saved buyback
python build_ore.py        # writes src/data/ore.json
```
Needs `HELIUS_KEY` in `.env` (locally) or as a GitHub secret (CI).
