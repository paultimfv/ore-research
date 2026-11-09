// GET /api/ask-context → this dashboard's data file as compact text, read by the "Ask AI" assistant.
import { getData } from "@/lib/data";
import { fromJson, contextResponse } from "@/lib/ask-context";

export const revalidate = 300;

export async function GET() {
  const data = await getData();
  return contextResponse([
    `# ORE on Solana (ore.paultimofeev.com)
Rebuilt from onchain data (Solana via Alchemy RPC; SOL/USD from Kraken daily close). Amounts in USD unless the field says SOL or ORE. Field names are as in the dashboard's data file; "last30" = the last 30 days.
`,
    fromJson("Dashboard data", data, { max: 150 }),
  ]);
}
