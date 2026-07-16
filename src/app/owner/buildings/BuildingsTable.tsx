"use client";

import DataTable, { type Column } from "@/components/DataTable";

export interface BuildingRow {
  id: string;
  name: string;
  electricity_rate: number;
  garbage_fee: number;
  flatCount: number;
}

export default function BuildingsTable({ rows }: { rows: BuildingRow[] }) {
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
    <DataTable
      columns={columns}
      rows={rows}
      searchAccessor={(r) => r.name}
      searchPlaceholder="Search buildings…"
      rowHref={(r) => `/owner/buildings/${r.id}`}
      emptyLabel="No buildings yet."
    />
  );
}
