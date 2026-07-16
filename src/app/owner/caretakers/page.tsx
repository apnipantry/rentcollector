import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DataTable, { type Column } from "@/components/DataTable";

interface CaretakerRow {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export default async function CaretakersPage() {
  const supabase = await createClient();
  const { data: caretakers } = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("role", "caretaker")
    .order("created_at", { ascending: false });

  const rows: CaretakerRow[] = caretakers ?? [];

  const columns: Column<CaretakerRow>[] = [
    {
      key: "name",
      header: "Name",
      accessor: (r) => (
        <span className="font-medium text-ink">{r.full_name}</span>
      ),
      sortValue: (r) => r.full_name?.toLowerCase() ?? "",
    },
    {
      key: "phone",
      header: "Phone",
      accessor: (r) => r.phone || "—",
    },
    {
      key: "added",
      header: "Added",
      accessor: (r) => new Date(r.created_at).toLocaleDateString(),
      sortValue: (r) => r.created_at,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Caretakers</h1>
        <Link
          href="/owner/caretakers/new"
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          + Add Caretaker
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchAccessor={(r) => r.full_name ?? ""}
        searchPlaceholder="Search caretakers…"
        emptyLabel="No caretakers added yet."
      />
    </div>
  );
}
