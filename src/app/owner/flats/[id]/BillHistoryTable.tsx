"use client";

import DataTable, { type Column } from "@/components/DataTable";

export interface BillHistoryRow {
  id: string;
  billing_month: string;
  tenantName: string;
  total: number;
  paid: number;
  difference: number;
  verified: boolean;
  reading_submitted_at: string | null;
}

export default function BillHistoryTable({ rows }: { rows: BillHistoryRow[] }) {
  const columns: Column<BillHistoryRow>[] = [
    {
      key: "month",
      header: "Month",
      accessor: (r) =>
        new Date(r.billing_month).toLocaleDateString("en-IN", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
      sortValue: (r) => r.billing_month,
    },
    {
      key: "tenant",
      header: "Tenant",
      accessor: (r) => r.tenantName,
      sortValue: (r) => r.tenantName.toLowerCase(),
    },
    {
      key: "total",
      header: "Total",
      accessor: (r) => `₹${r.total}`,
      sortValue: (r) => r.total,
      align: "right",
    },
    {
      key: "paid",
      header: "Paid",
      accessor: (r) => `₹${r.paid}`,
      sortValue: (r) => r.paid,
      align: "right",
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) => {
        if (!r.reading_submitted_at) {
          return <span className="text-ink-muted">No reading</span>;
        }
        if (r.difference > 0) {
          return <span className="text-amber">₹{r.difference} due</span>;
        }
        return (
          <span className="text-accent">
            Settled{!r.verified && <span className="text-amber"> · unverified</span>}
          </span>
        );
      },
      sortValue: (r) => r.difference,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowTone={(r) => (r.difference > 0 || !r.reading_submitted_at ? "amber" : "default")}
      emptyLabel="No bills yet for this flat."
    />
  );
}
