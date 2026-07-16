"use client";

import DataTable, { type Column } from "@/components/DataTable";

export interface TenantListRow {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  flatId: string;
  roomNo: string;
  buildingName: string;
}

export default function TenantsListTable({ rows }: { rows: TenantListRow[] }) {
  const columns: Column<TenantListRow>[] = [
    {
      key: "name",
      header: "Tenant",
      accessor: (r) => <span className="font-medium text-ink">{r.name}</span>,
      sortValue: (r) => r.name.toLowerCase(),
    },
    {
      key: "location",
      header: "Flat",
      accessor: (r) => `${r.buildingName} · Room ${r.roomNo}`,
      sortValue: (r) => `${r.buildingName} ${r.roomNo}`.toLowerCase(),
    },
    {
      key: "phone",
      header: "Phone",
      accessor: (r) => r.phone || "—",
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) =>
        r.is_active ? (
          <span className="text-accent">Active</span>
        ) : (
          <span className="text-ink-muted">Moved out</span>
        ),
      sortValue: (r) => (r.is_active ? 0 : 1),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      searchAccessor={(r) => `${r.name} ${r.buildingName} ${r.roomNo}`}
      searchPlaceholder="Search tenants, buildings, rooms…"
      rowHref={(r) => `/owner/flats/${r.flatId}`}
      rowTone={(r) => (r.is_active ? "default" : "amber")}
      emptyLabel="No tenants yet."
    />
  );
}
