import { readFileSync } from "node:fs";
import path from "node:path";

import Dashboard from "@/components/Dashboard";
import { parseFighters } from "@/lib/parse";

/**
 * Server component: the CSV is read and validated once at build time and the
 * parsed roster is handed to the client dashboard as a prop. The CSV stays the
 * single source of truth - edit it and rebuild, no codegen step in between.
 */
export default function Page() {
  const csv = readFileSync(
    path.join(process.cwd(), "smash_tier_analysis.csv"),
    "utf8"
  );
  const fighters = parseFighters(csv);

  return <Dashboard fighters={fighters} />;
}
