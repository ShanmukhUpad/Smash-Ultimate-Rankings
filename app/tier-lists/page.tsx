import { readFileSync } from "node:fs";
import path from "node:path";

import { parseFighters } from "@/lib/parse";
import TierListGallery from "@/components/TierListGallery";

export const metadata = {
  title: "Source tier lists",
  description:
    "The two rankings the analysis compares. A personal comfort tier list and the 4th Official competitive tier list.",
};

/**
 * The images are the provenance for the whole dashboard. Every number in the
 * analysis derives from these two rankings, so a few counts are read back out
 * of the CSV and shown alongside them.
 */
export default function TierListsPage() {
  const fighters = parseFighters(
    readFileSync(path.join(process.cwd(), "smash_tier_analysis.csv"), "utf8")
  );

  return <TierListGallery fighters={fighters} />;
}
