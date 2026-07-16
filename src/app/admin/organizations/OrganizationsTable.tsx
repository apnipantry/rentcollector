"use client";

import DataTable, { type Column } from "@/components/DataTable";

export interface OrgRow {
  id: string;
  name: string;
  contact_phone: string | null;
  created_at: string;
  ownerName: string | null;
  ownerPhone: string | null;
}

export default function OrganizationsTable({ rows }: { rows: OrgRow[] }) {
  const columns: Column<OrgRow>[] = [
    {
      key: "name",
      header: "Organization",
      accessor: (r) => <span className="font-medium text-ink">{r.name}</span>,
      sortValue: (r) => r.name.toLowerCase(),
    },
    {
      key: "owner",
      header: "Owner",
      accessor: (r) =>
        r.ownerName || <span className="text-ink-muted">No owner yet</span>,
      sortValue: (r) => r.ownerName?.toLowerCase() ?? "",
    },
    {
      key: "contact",
      header: "Contact",
      accessor: (r) => r.contact_phone || r.ownerPhone || "—",
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
      searchAccessor={(r) => `${r.name} ${r.ownerName ?? ""}`}
      searchPlaceholder="Search organizations or owners…"
      emptyLabel="No building owners yet."
    />
  );
}
