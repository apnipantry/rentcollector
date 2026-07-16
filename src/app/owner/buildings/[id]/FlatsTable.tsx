"use client";

import DataTable, { type Column } from "@/components/DataTable";

export interface FlatRow {
  id: string;
  room_no: string;
  rent: number;
  tenantName: string | null;
}

export default function FlatsTable({ rows }: { rows: FlatRow[] }) {
  const columns: Column<FlatRow>[] = [
    {
      key: "room",
      header: "Room",
      accessor: (r) => (
        <span className="font-medium text-ink">Room {r.room_no}</span>
      ),
      sortValue: (r) => r.room_no,
    },
    {
      key: "tenant",
      header: "Tenant",
      accessor: (r) =>
        r.tenantName || <span className="text-ink-muted">Vacant</span>,
      sortValue: (r) => r.tenantName?.toLowerCase() ?? "",
    },
    {
      key: "rent",
      header: "Rent",
      accessor: (r) => `₹${r.rent}`,
      sortValue: (r) => r.rent,
      align: "right",
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      searchAccessor={(r) => `${r.room_no} ${r.tenantName ?? ""}`}
      searchPlaceholder="Search flats…"
      rowHref={(r) => `/owner/flats/${r.id}`}
      rowTone={(r) => (r.tenantName ? "default" : "amber")}
      emptyLabel="No flats yet."
    />
  );
}
