"use client";

import DataTable, { type Column } from "@/components/DataTable";

export interface CaretakerRow {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export default function CaretakersTable({ rows }: { rows: CaretakerRow[] }) {
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
    <DataTable
      columns={columns}
      rows={rows}
      searchAccessor={(r) => r.full_name ?? ""}
      searchPlaceholder="Search caretakers…"
      emptyLabel="No caretakers added yet."
    />
  );
}
