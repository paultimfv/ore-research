// GET /api/model: ORE's daily onchain series rolled up for a model sheet.
//   ?period=month (default) | quarter | year    ?from=2025-10-01    ?format=csv (default) | json
// Google Sheets: =IMPORTDATA("<this site>/api/model?period=month")
import { getData } from "@/lib/data";
import { respond, type Metric, type Row } from "@/lib/model-export";

export const revalidate = 300;

const METRICS: Metric[] = [
  { section: "ACTIVITY", label: "Rounds", key: "rounds", agg: "sum" },
  { section: "ACTIVITY", label: "Avg miners per round", key: "avgMiners", agg: "avg" },
  { section: "ACTIVITY", label: "SOL deployed", key: "deployed", agg: "sum" },
  { section: "ACTIVITY", label: "USD deployed", key: "deployedUsd", agg: "sum" },
  { section: "REVENUE", label: "SOL to vault (10% of deployed)", key: "vaulted", agg: "sum" },
  { section: "REVENUE", label: "USD to vault", key: "vaultedUsd", agg: "sum" },
  { section: "REVENUE", label: "SOL admin fee (1%)", key: "adminFee", agg: "sum" },
  { section: "REVENUE", label: "USD admin fee", key: "adminFeeUsd", agg: "sum" },
  { section: "REVENUE", label: "Protocol revenue USD (vault + admin fee)", key: "revenueUsd", agg: "sum" },
  { section: "REVENUE", label: "Take rate (revenue / deployed)", key: "take", agg: "ratio", num: "revenueUsd", den: "deployedUsd" },
  { section: "BUYBACKS", label: "Buybacks (count)", key: "bbCount", agg: "sum" },
  { section: "BUYBACKS", label: "SOL spent on buybacks", key: "bbSol", agg: "sum" },
  { section: "BUYBACKS", label: "USD spent on buybacks", key: "bbUsd", agg: "sum" },
  { section: "BUYBACKS", label: "ORE buried (burned)", key: "buried", agg: "sum" },
  { section: "BUYBACKS", label: "ORE shared to stakers", key: "shared", agg: "sum" },
  { section: "SUPPLY", label: "ORE minted", key: "minted", agg: "sum" },
  { section: "SUPPLY", label: "Motherlode hits", key: "motherlodeHits", agg: "sum" },
  { section: "SUPPLY", label: "Net ORE issued (minted - buried)", key: "netIssued", agg: "sum" },
  { section: "PRICES", label: "ORE price USD (period end)", key: "priceUsd", agg: "last" },
  { section: "PRICES", label: "SOL price USD (period end)", key: "solUsd", agg: "last" },
  { section: "PRICES", label: "Production cost per ORE USD (avg)", key: "prodCostUsd", agg: "avg" },
];

export async function GET(request: Request) {
  const data = await getData();
  const rows: Row[] = data.daily.map((r) => {
    const px = r.solUsd ?? 0;
    return {
      ...r, vaultedUsd: r.vaulted * px, adminFeeUsd: r.adminFee * px, revenueUsd: (r.vaulted + r.adminFee) * px,
      bbUsd: r.bbSol * px, netIssued: r.minted - r.buried,
    };
  });
  return respond(request, rows, METRICS, { source: "ORE onchain (Solana), refreshed hourly", generatedAt: data.generatedAt });
}
