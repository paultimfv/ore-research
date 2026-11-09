# ore-research

Dashboard and onchain data pipeline for ORE on Solana.

Live: https://ore-dashboard-beige.vercel.app

## Data

| Data | Source | Refresh |
|---|---|---|
| Rounds (SOL deployed, treasury cut, ORE minted, winning tile, motherlode) | ORE program reset events, from transactions to the admin fee wallet, Helius RPC | hourly |
| Buybacks (SOL spent, ORE burned, ORE to stakers, supply) | ORE program bury events, from transactions to the treasury wSOL account, Helius RPC | hourly |
| Supply, staked ORE, treasury balance | Mint, stake and treasury accounts, Helius RPC | hourly |
| SOL/USD | Kraken daily close | hourly |

Addresses are listed on the dashboard and in `scripts/`. Method details: `PIPELINE.md`.

## Layout

```
scripts/pull_rounds.py     reset events -> data/raw/rounds/YYYY-MM.csv
scripts/pull_buybacks.py   bury events -> data/raw/buybacks.csv
scripts/build_ore.py       data/raw -> src/data/ore.json
src/                       Next.js app
.github/workflows/daily.yml
```

## Run

```
python -m venv .venv && .venv/bin/pip install -r requirements.txt
echo "HELIUS_KEY=..." > .env
cd scripts && ../.venv/bin/python pull_rounds.py && ../.venv/bin/python pull_buybacks.py && ../.venv/bin/python build_ore.py
cd .. && npm install && npm run dev
```
