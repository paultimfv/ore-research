// Live ORE state, read straight from Solana on the server and cached for 60 seconds (page revalidate = 60).
// Same accounts and offsets as scripts/build_ore.py. Uses Alchemy when ALCHEMY_KEY is set on Vercel, otherwise the
// public Solana RPC: ~6 calls a minute either way, well inside free tiers. Any failure falls back to the hourly snapshot.
import type { OreData } from "@/lib/data";

const RPC = process.env.SOLANA_RPC_URL
  ?? (process.env.ALCHEMY_KEY ? `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}` : "https://api.mainnet-beta.solana.com");
const LAMPORTS = 1e9, GRAMS = 1e11;
const MINT = "oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp";
const TREASURY = "45db2FSR4mcXdSVVZbKbwojU6uYDpMyhpEi7cC8nHaWG";
const TREASURY_ORE = "GwZS8yBuPPkPgY4uh7eEhHN5EEdpkf7EBZ1za6nuP3wF";
const STAKE_TREASURY = "F3ajpARUkbMnYsrbAmgnsjyp991DVbGYRzfaVXy1Dfvu";
const BOARD = "BrcSxdp1nXFzou1YyDnQJcPNBNHgoypZmTsyKBSLLXzi";

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  for (let i = 0; ; i++) {   // free tiers rate-limit bursts: retry 429s a few times with a short backoff
    const r = await fetch(RPC, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), next: { revalidate: 60 }, signal: AbortSignal.timeout(8000),
    });
    if (r.status === 429 && i < 4) { await new Promise((ok) => setTimeout(ok, 400 * (i + 1))); continue; }
    const j = await r.json();
    if (j.error) throw new Error(JSON.stringify(j.error));
    return j.result as T;
  }
}
const u64s = async (addr: string) => {
  const res = await rpc<{ value: { data: [string, string] } }>("getAccountInfo", [addr, { encoding: "base64" }]);
  const b = Buffer.from(res.value.data[0], "base64");
  const out: number[] = [];
  for (let o = 0; o + 8 <= b.length; o += 8) out.push(Number(b.readBigUInt64LE(o)));
  return out;
};

export type Live = OreData["live"] & { at: string; fresh: boolean };

export async function liveOre(snapshot: OreData["live"], snapshotAt: string): Promise<Live> {
  try {
    // one after another, not in parallel: keeps under free-tier per-second limits
    const mint = await rpc<{ value: { data: { parsed: { info: { supply: string } } } } }>("getAccountInfo", [MINT, { encoding: "jsonParsed" }]);
    const t = await u64s(TREASURY), st = await u64s(STAKE_TREASURY), board = await u64s(BOARD);
    const bal = await rpc<{ value: number }>("getBalance", [TREASURY]);
    const tOre = await rpc<{ value: { uiAmountString: string } }>("getTokenAccountBalance", [TREASURY_ORE]);
    return {
      ...snapshot,
      supply: Math.round((Number(mint.value.data.parsed.info.supply) / GRAMS) * 100) / 100,
      motherlodePool: Math.round((t[1] / GRAMS) * 100) / 100,
      unrefinedOre: Math.round(t[5] / GRAMS),
      refinedOre: Math.round(t[4] / GRAMS),
      treasurySol: Math.round((bal.value / LAMPORTS) * 10) / 10,
      treasuryOre: Math.round(Number(tOre.value.uiAmountString)),
      stakedOre: Math.round(st[3] / GRAMS),
      round: board[1],
      at: new Date().toISOString(), fresh: true,
    };
  } catch (e) {
    console.warn("liveOre: falling back to the hourly snapshot:", String(e).replace(RPC, "<rpc>").slice(0, 300));
    return { ...snapshot, at: snapshotAt, fresh: false };
  }
}
