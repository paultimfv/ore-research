"""Pull every ORE buyback (Buyback ix 13) and its BuryEvent.

Source: all txs touching the treasury's wrapped-SOL account, where vaulted SOL waits until the
bury authority swaps it to ORE through Jupiter. The BuryEvent (ore Log ix, disc 1) gives SOL spent,
ORE burned, ORE shared with stakers, and circulating supply after the burn.
Writes data/raw/buybacks.csv (full rewrite of rows after the last saved ts).
"""
import csv, struct, time
from common import ROOT, txs_for_address, inner_ixs

ORE = "oreV3EG1i9BEgiAJ8b177Z2S2rMarzak4NMv1kULvWv"
TREASURY_WSOL = "Ef4Bu9FQ8v8yV8HEKKfsb7W9XjYoyvCDhGVNVA3jkLzm"
OUT = ROOT / "data/raw/buybacks.csv"
COLS = ["ts", "sol_spent", "ore_buried", "ore_shared", "supply_after", "sig"]


def parse_bury(d):
    b = d[1:]
    if len(b) < 48 or struct.unpack_from("<Q", b, 0)[0] != 1:
        return None
    _, buried, shared, sol, supply, ts = struct.unpack_from("<5Qq", b, 0)
    return [ts, sol, buried, shared, supply]


def main():
    start = 0
    if OUT.exists():
        rows = list(csv.reader(open(OUT)))[1:]
        start = int(rows[-1][0]) + 1 if rows else 0
    else:
        with open(OUT, "w", newline="") as f:
            csv.writer(f).writerow(COLS)
    token, n = None, 0
    with open(OUT, "a", newline="") as f:
        w = csv.writer(f)
        while True:
            page, token = txs_for_address(TREASURY_WSOL, start, int(time.time()), token)
            for tx in page:
                for prog, d in inner_ixs(tx):
                    if prog == ORE and d[:1] == b"\x08":
                        r = parse_bury(d)
                        if r:
                            w.writerow(r + [tx["transaction"]["signatures"][0][:16]])
                            n += 1
            if not token or not page:
                break
    print("buybacks", n)


if __name__ == "__main__":
    main()
