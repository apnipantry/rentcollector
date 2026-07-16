import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import BuildingsTable, { type BuildingRow } from "./BuildingsTable";

export default async function BuildingsPage() {
  const supabase = await createClient();
  const { data: buildings } = await supabase
    .from("buildings")
    .select("id, name, electricity_rate, garbage_fee, flats(count)")
    .order("created_at", { ascending: false });

  const rows: BuildingRow[] =
    buildings?.map((b) => ({
      id: b.id,
      name: b.name,
      electricity_rate: b.electricity_rate,
      garbage_fee: b.garbage_fee,
      flatCount:
        (b.flats as unknown as { count: number }[])?.[0]?.count ?? 0,
    })) ?? [];

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Buildings</h1>
        <Link
          href="/owner/buildings/new"
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          + Add Building
        </Link>
      </div>

      <BuildingsTable rows={rows} />
    </div>
  );
}
