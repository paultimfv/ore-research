// Data lives in the GitHub repo (the hourly workflow commits it), so the site reads it straight from there and
// re-checks every 5 minutes: fresh data with no redeploy. The copy bundled at build time is the fallback.
import fallback from "@/data/ore.json";

export type OreData = typeof fallback;
const RAW = "https://raw.githubusercontent.com/paultimfv/ore-research/main/src/data/ore.json";

export async function getData(): Promise<OreData> {
  try {
    const r = await fetch(RAW, { next: { revalidate: 300 } });
    if (r.ok) {
      const d = (await r.json()) as OreData;
      if (d?.totals && d?.daily?.length) return d;
    }
  } catch {}
  return fallback;
}
