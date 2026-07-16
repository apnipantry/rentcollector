import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DataTable, { type Column } from "@/components/DataTable";

interface BuildingRow {
  id: string;
  name: string;
  electricity_rate: number;
  garbage_fee: number;
  flatCount: number;
}

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

  const columns: Column<BuildingRow>[] = [
    {
      key: "name",
      header: "Building",
      accessor: (r) => <span className="font-medium text-ink">{r.name}</span>,
      sortValue: (r) => r.name.toLowerCase(),
    },
    {
      key: "rate",
      header: "Electricity",
      accessor: (r) => `₹${r.electricity_rate}/unit`,
      sortValue: (r) => r.electricity_rate,
    },
    {
      key: "garbage",
      header: "Garbage fee",
      accessor: (r) => `₹${r.garbage_fee}`,
      sortValue: (r) => r.garbage_fee,
    },
    {
      key: "flats",
      header: "Flats",
      accessor: (r) => r.flatCount,
      sortValue: (r) => r.flatCount,
      align: "right",
    },
  ];

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

      <DataTable
        columns={columns}
        rows={rows}
        searchAccessor={(r) => r.name}
        searchPlaceholder="Search buildings…"
        rowHref={(r) => `/owner/buildings/${r.id}`}
        emptyLabel="No buildings yet."
      />
    </div>
  );
}
