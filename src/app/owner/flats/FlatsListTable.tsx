"use client";

import DataTable, { type Column } from "@/components/DataTable";

export interface FlatListRow {
  id: string;
  room_no: string;
  rent: number;
  buildingName: string;
  tenantName: string | null;
}

export default function FlatsListTable({ rows }: { rows: FlatListRow[] }) {
  const columns: Column<FlatListRow>[] = [
    {
      key: "building",
      header: "Building",
      accessor: (r) => r.buildingName,
      sortValue: (r) => r.buildingName.toLowerCase(),
    },
    {
      key: "room",
      header: "Room",
      accessor: (r) => (
        <span className="font-medium text-ink">{r.room_no}</span>
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
      searchAccessor={(r) => `${r.buildingName} ${r.room_no} ${r.tenantName ?? ""}`}
      searchPlaceholder="Search flats, buildings, tenants…"
      rowHref={(r) => `/owner/flats/${r.id}`}
      rowTone={(r) => (r.tenantName ? "default" : "amber")}
      emptyLabel="No flats yet."
    />
  );
}
