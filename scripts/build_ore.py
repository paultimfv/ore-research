"""Aggregate raw ORE rounds + buybacks into src/data/ore.json for the dashboard.

Inputs:  data/raw/rounds/*.csv (one row per round), data/raw/buybacks.csv (one row per buyback)
Live:    mint supply, treasury, staking and board accounts via RPC; SOL/USD daily closes from Kraken.
"""
import time
import csv, json, glob, math, struct, base64, datetime as dt, time
from collections import defaultdict
import requests
from common import ROOT, rpc

LAMPORTS, GRAMS = 1e9, 1e11
MINT = "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp"
TREASURY = "45db2FSR4mcXdSVVZbKbwojU6uYDpMyhpEi7cC8nHaWG"
TREASURY_ORE = "GwZS8yBuPPkPgY4uh7eEhHN5EEdpkf7EBZ1za6nuP3wF"
STAKE_TREASURY = "F3ajpARUkbMnYsrbAmgnsjyp991DVbGYRzfaVXy1Dfvu"
BOARD = "BrcSxdp1nXFzou1YyDnQJcPNBNHgoypZmTsyKBSLLXzi"
SPLIT = "SpLiT11111111111111111111111111111111111112"
NONE = "11111111111111111111111111111111"


def day(ts):
    return dt.datetime.fromtimestamp(int(ts), dt.timezone.utc).strftime("%Y-%m-%d")


def r2(x, n=2):
    return round(x, n) if x is not None else None


def load_rounds():
    rows = []
    for f in sorted(glob.glob(str(ROOT / "data/raw/rounds/*.csv"))):
        for r in csv.DictReader(open(f)):
            rows.append(r)
    seen, out = set(), []
    for r in sorted(rows, key=lambda r: int(r["round_id"])):
        if r["round_id"] in seen:
            continue
        seen.add(r["round_id"])
        out.append(r)
    return out


def sol_usd():
    for i in range(4):   # Kraken occasionally times out; retry before failing the run
        try:
            r = requests.get("https://api.kraken.com/0/public/OHLC",
                             params={"pair": "SOLUSD", "interval": 1440, "since": 1756684800}, timeout=30).json()
            break
        except requests.RequestException:
            if i == 3: raise
            time.sleep(10 * (i + 1))
    k = next(iter(r["result"].keys() - {"last"}))
    return {day(c[0]): float(c[4]) for c in r["result"][k]}


def acct_u64s(addr):
    d = base64.b64decode(rpc("getAccountInfo", [addr, {"encoding": "base64"}])["value"]["data"][0])
    return [struct.unpack_from("<Q", d, o)[0] for o in range(0, len(d) - 7, 8)]


def main():
    rounds = load_rounds()
    buys = list(csv.DictReader(open(ROOT / "data/raw/buybacks.csv")))
    px = sol_usd()

    D = defaultdict(lambda: defaultdict(float))
    sq_wins = [0] * 25
    motherlodes, solo_wins, split_rounds = [], 0, 0
    miners_hist = defaultdict(int)
    biggest = []
    for r in rounds:
        d = D[day(r["ts"])]
        dep, vault, wins = int(r["deployed"]), int(r["vaulted"]), int(r["winnings"])
        d["rounds"] += 1
        d["deployed"] += dep / LAMPORTS
        d["vaulted"] += vault / LAMPORTS
        d["winnings"] += wins / LAMPORTS
        d["other_fees"] += dep / 100 / LAMPORTS  # admin fee: 1% of every square (calculate_fees)
        d["minted"] += int(r["minted"]) / GRAMS
        d["miners"] += int(r["miners"])
        if dep == 0:
            d["empty_rounds"] += 1
        ml = int(r["motherlode"]) / GRAMS
        if ml > 0:
            d["motherlode_hits"] += 1
            d["motherlode_ore"] += ml
            motherlodes.append({"round": int(r["round_id"]), "date": day(r["ts"]), "ore": r2(ml, 1),
                                "miners": int(r["miners"]), "deployed": r2(dep / LAMPORTS, 2)})
        if dep > 0 and int(r["winning_square"]) < 25:  # u64::MAX when the round had no valid entropy
            sq_wins[int(r["winning_square"])] += 1
            if r["top_miner"] == SPLIT:
                split_rounds += 1
            elif r["top_miner"] != NONE:
                solo_wins += 1
        miners_hist[min(int(r["miners"]) // 50 * 50, 1000)] += 1
        biggest.append((dep, r))

    for b in buys:
        d = D[day(b["ts"])]
        sol = int(b["sol_spent"]) / LAMPORTS
        bur, sh = int(b["ore_buried"]) / GRAMS, int(b["ore_shared"]) / GRAMS
        d["bb_sol"] += sol
        d["bb_buried"] += bur
        d["bb_shared"] += sh
        d["bb_count"] += 1
        d["supply"] = int(b["supply_after"]) / GRAMS

    days = sorted(D)
    series, cum = [], defaultdict(float)
    last_supply = None
    for k in days:
        d = D[k]
        for f in ["deployed", "vaulted", "minted", "bb_sol", "bb_buried", "bb_shared", "motherlode_ore", "other_fees"]:
            cum[f] += d[f]
        bought = d["bb_buried"] + d["bb_shared"]
        p_sol = d["bb_sol"] / bought if bought > 0 else None
        s = px.get(k)
        prod_cost = d["vaulted"] / d["minted"] if d["minted"] else None  # protocol's own definition
        last_supply = d["supply"] or last_supply
        series.append({
            "d": k,
            "rounds": int(d["rounds"]),
            "deployed": r2(d["deployed"], 1),
            "vaulted": r2(d["vaulted"], 2),
            "adminFee": r2(d["other_fees"], 2),
            "minted": r2(d["minted"], 1),
            "avgMiners": r2(d["miners"] / d["rounds"], 0) if d["rounds"] else None,
            "motherlodeHits": int(d["motherlode_hits"]),
            "bbSol": r2(d["bb_sol"], 2),
            "buried": r2(d["bb_buried"], 1),
            "shared": r2(d["bb_shared"], 1),
            "bbCount": int(d["bb_count"]),
            "priceSol": r2(p_sol, 4),
            "priceUsd": r2(p_sol * s, 2) if p_sol and s else None,
            "prodCostSol": r2(prod_cost, 4),
            "prodCostUsd": r2(prod_cost * s, 2) if prod_cost and s else None,
            "solUsd": s,
            "deployedUsd": round(d["deployed"] * s) if s else None,
            "vaultedUsd": round(d["vaulted"] * s) if s else None,
            "netIssuance": r2(d["minted"] - d["bb_buried"], 1),
            "supply": r2(last_supply, 0) if last_supply else None,
            "cumDeployed": round(cum["deployed"]),
            "cumVaulted": r2(cum["vaulted"], 1),
            "cumMinted": round(cum["minted"]),
            "cumBuried": round(cum["bb_buried"]),
            "cumShared": round(cum["bb_shared"]),
        })

    # weekly roll-up for the busier charts
    wk = defaultdict(lambda: defaultdict(float))
    for s in series:
        w = (dt.date.fromisoformat(s["d"]) - dt.timedelta(days=dt.date.fromisoformat(s["d"]).weekday())).isoformat()
        for f in ["deployed", "vaulted", "minted", "buried", "shared", "bbSol", "deployedUsd", "vaultedUsd"]:
            wk[w][f] += s[f] or 0
    weekly = [{"w": w, **{f: round(v, 1) for f, v in wk[w].items()}} for w in sorted(wk)]

    # live snapshot
    supply = int(rpc("getAccountInfo", [MINT, {"encoding": "jsonParsed"}])["value"]["data"]["parsed"]["info"]["supply"]) / GRAMS
    t = acct_u64s(TREASURY)  # disc, motherlode, rewards_factor(2), total_refined, total_unclaimed
    st = acct_u64s(STAKE_TREASURY)
    board = acct_u64s(BOARD)  # disc, round_id, start_slot, end_slot, epoch
    treasury_sol = rpc("getBalance", [TREASURY])["value"] / LAMPORTS
    treasury_ore = float(rpc("getTokenAccountBalance", [TREASURY_ORE])["value"]["uiAmountString"])

    last30 = series[-31:-1] if len(series) > 31 else series
    sum30 = lambda f: sum((s[f] or 0) for s in last30)
    total_wins = sum(sq_wins)
    exp = total_wins / 25
    chi2 = sum((w - exp) ** 2 / exp for w in sq_wins)
    biggest.sort(key=lambda x: -x[0])
    top_rounds = [{"round": int(r["round_id"]), "date": day(r["ts"]), "deployed": r2(dep / LAMPORTS, 1),
                   "miners": int(r["miners"])} for dep, r in biggest[:8]]
    latest_px = next((s for s in reversed(series) if s["priceUsd"]), None)

    out = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "firstRound": {"id": int(rounds[0]["round_id"]), "date": day(rounds[0]["ts"])},
        "lastRound": {"id": int(rounds[-1]["round_id"]), "date": day(rounds[-1]["ts"])},
        "totals": {
            "rounds": len(rounds),
            "deployedSol": round(cum["deployed"]),
            "vaultedSol": round(cum["vaulted"]),
            "adminFeeSol": round(cum["other_fees"]),
            "mintedOre": round(cum["minted"]),
            "motherlodeOre": round(cum["motherlode_ore"]),
            "motherlodeHits": len(motherlodes),
            "buybacks": len(buys),
            "buybackSol": round(cum["bb_sol"]),
            "buriedOre": round(cum["bb_buried"]),
            "sharedOre": round(cum["bb_shared"]),
            "deployedUsd": round(sum(s["deployedUsd"] or 0 for s in series)),
            "vaultedUsd": round(sum(s["vaultedUsd"] or 0 for s in series)),
            "splitRounds": split_rounds,
            "soloRounds": solo_wins,
        },
        "last30": {
            "deployedSol": round(sum30("deployed")),
            "vaultedSol": round(sum30("vaulted")),
            "mintedOre": round(sum30("minted")),
            "buriedOre": round(sum30("buried")),
            "bbSol": round(sum30("bbSol")),
            "deployedUsd": round(sum30("deployedUsd")),
            "vaultedUsd": round(sum30("vaultedUsd")),
            "avgMiners": round(sum((s["avgMiners"] or 0) for s in last30) / max(len(last30), 1)),
        },
        "live": {
            "supply": round(supply, 2),
            "maxSupply": 3_000_000,  # ore-mint-api MAX_SUPPLY
            "motherlodePool": round(t[1] / GRAMS, 2),
            "unrefinedOre": round(t[5] / GRAMS),
            "refinedOre": round(t[4] / GRAMS),
            "treasurySol": round(treasury_sol, 1),
            "treasuryOre": round(treasury_ore),
            "stakedOre": round(st[3] / GRAMS),
            "round": board[1],
            "priceUsd": latest_px["priceUsd"] if latest_px else None,
            "priceSol": latest_px["priceSol"] if latest_px else None,
            "solUsd": series[-1]["solUsd"] or (series[-2]["solUsd"] if len(series) > 1 else None),
        },
        "squares": sq_wins,
        "squaresChi2": round(chi2, 1),
        "motherlodes": sorted(motherlodes, key=lambda m: -m["ore"])[:12],
        "motherlodeCount": len(motherlodes),
        "minersHist": [{"bucket": k, "rounds": v} for k, v in sorted(miners_hist.items())],
        "topRounds": top_rounds,
        "daily": series,
        "weekly": weekly,
    }
    (ROOT / "src/data").mkdir(parents=True, exist_ok=True)
    json.dump(out, open(ROOT / "src/data/ore.json", "w"), separators=(",", ":"))
    print(json.dumps({k: out[k] for k in ["firstRound", "lastRound", "totals", "last30", "live", "squaresChi2", "motherlodeCount"]}, indent=1))


if __name__ == "__main__":
    main()
