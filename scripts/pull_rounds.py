"""Pull every ORE round (one Reset tx per ~minute) and decode its ResetEvent.

Source: Helius getTransactionsForAddress on the admin fee collector, which receives the 1% admin
fee in every Reset tx and does nothing else. Each Reset tx carries a self-CPI `Log` instruction
(ore ix 8) whose data is the ResetEvent struct (see regolith-labs/ore api/src/event.rs).

Writes data/raw/rounds/YYYY-MM.csv. Months that are fully in the past get a .done marker and are skipped.
Usage: python pull_rounds.py [YYYY-MM ...]
"""
import sys, csv, struct, calendar, time, datetime as dt
from concurrent.futures import ThreadPoolExecutor
import base58
from common import ROOT, txs_for_address, inner_ixs

ORE = "oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv"
# The admin fee collector changed once (round 42,531, 2025-11-04 16:53 UTC).
FEE_COLLECTORS = [("tHCCE3KWKx8i8cDjX2DQ3Z7EMJkScAVwkfxdWz8SqgP", 0, 1762275221),
                  ("DyB4Kv6V613gp2LWQTq1dwDYHGKuUEoDHnCouGUtxFiX", 1762275221, 2**40)]
START = (2025, 9)
OUT = ROOT / "data/raw/rounds"
COLS = ["round_id", "ts", "winning_square", "miners", "motherlode", "deployed", "vaulted",
        "winnings", "minted", "deployed_winning", "top_miner", "sig"]


def parse_reset(d):
    # d[0] = ix tag 8 (Log), then the event: disc u64, round_id, start_slot, end_slot, winning_square,
    # top_miner[32], total_miners, motherlode, total_deployed, total_vaulted, total_winnings,
    # total_minted, ts, rng, deployed_winning_square
    b = d[1:]
    if len(b) < 128 or struct.unpack_from("<Q", b, 0)[0] != 0:
        return None
    disc, rid, s0, s1, win = struct.unpack_from("<5Q", b, 0)
    top = base58.b58encode(b[40:72]).decode()
    miners, ml, dep, vault, wins, minted, ts = struct.unpack_from("<6Qq", b, 72)
    depwin = struct.unpack_from("<Q", b, 136)[0] if len(b) >= 144 else ""
    return [rid, ts, win, miners, ml, dep, vault, wins, minted, depwin, top]


def month_bounds(y, m):
    a = calendar.timegm((y, m, 1, 0, 0, 0))
    y2, m2 = (y + 1, 1) if m == 12 else (y, m + 1)
    return a, calendar.timegm((y2, m2, 1, 0, 0, 0))


def pull_month(y, m):
    tag = f"{y}-{m:02d}"
    path, done = OUT / f"{tag}.csv", OUT / f"{tag}.done"
    if done.exists():
        return tag, "skip"
    a, b = month_bounds(y, m)
    # resume from the last saved round of this month
    if path.exists():
        rows = list(csv.reader(open(path)))[1:]
        if rows:
            a = int(rows[-1][1]) + 1
    else:
        with open(path, "w", newline="") as f:
            csv.writer(f).writerow(COLS)
    now = int(time.time())
    n = 0
    with open(path, "a", newline="") as f:
        w = csv.writer(f)
        for addr, lo, hi in FEE_COLLECTORS:
            seg_a, seg_b = max(a, lo), min(b, now, hi)
            token = None
            while seg_a < seg_b:
                page, token = txs_for_address(addr, seg_a, seg_b, token)
                for tx in page:
                    for prog, d in inner_ixs(tx):
                        if prog == ORE and d[:1] == b"\x08":
                            r = parse_reset(d)
                            if r:
                                w.writerow(r + [tx["transaction"]["signatures"][0][:16]])
                                n += 1
                f.flush()
                if not token or not page:
                    break
    if b <= now - 3600:
        done.touch()
    return tag, n


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    if len(sys.argv) > 1:
        months = [tuple(map(int, s.split("-"))) for s in sys.argv[1:]]
    else:
        today = dt.date.today()
        months, (y, m) = [], START
        while (y, m) <= (today.year, today.month):
            months.append((y, m))
            y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    with ThreadPoolExecutor(6) as ex:
        for tag, n in ex.map(lambda ym: pull_month(*ym), months):
            print(tag, n, flush=True)
