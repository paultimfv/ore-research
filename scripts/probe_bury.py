"""One-off: every BuryEvent seen by the stake treasury's ORE account, to find burns that don't go through the wSOL account."""
import csv, time
from common import txs_for_address, inner_ixs
from pull_buybacks import parse_bury
A = "BHnZihpszx6e9rmN2ZQkABBUhwQ1AFYUUpjY6yrVzz3h"
ORE = "oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv"
tok, n = None, 0
with open("/private/tmp/claude-501/-Users-Paul-Documents-the-main-vault/d7baa90d-6f5d-4c68-a926-15c73bb2e7a9/scratchpad/bury_probe.csv", "w", newline="") as f:
    w = csv.writer(f)
    while True:
        page, tok = txs_for_address(A, 0, int(time.time()), tok)
        for tx in page:
            for p, d in inner_ixs(tx):
                if p == ORE and d[:1] == b"\x08":
                    r = parse_bury(d)
                    if r:
                        w.writerow(r + [tx["transaction"]["signatures"][0][:16]]); n += 1
        if not tok or not page:
            break
print("events", n)
