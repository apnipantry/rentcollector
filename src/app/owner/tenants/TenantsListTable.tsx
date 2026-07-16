"use client";

import { useState, useTransition } from "react";
import DataTable, { type Column } from "@/components/DataTable";
import { updateBillPayment } from "@/app/owner/bills/actions";

export interface TenantListRow {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  flatId: string;
  roomNo: string;
  buildingName: string;
  billId: string | null;
  total: number | null;
  paid: number | null;
  mode: string | null;
  verified: boolean | null;
  difference: number | null;
}

function MarkPaidCell({ row }: { row: TenantListRow }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (!row.billId || row.total === null) {
    return <span className="text-ink-muted">—</span>;
  }

  const fullyPaid = (row.paid ?? 0) >= row.total || done;

  if (fullyPaid) {
    return <span className="text-accent">Paid</span>;
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    const formData = new FormData();
    formData.set("billId", row.billId!);
    formData.set("paid", String(row.total));
    formData.set("mode", row.mode ?? "");
    formData.set("verified", row.verified ? "on" : "");
    startTransition(async () => {
      try {
        await updateBillPayment(formData);
        setDone(true);
      } catch {
        // swallow here — the bills page is the place for error detail
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded border border-ink px-2 py-1 text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
    >
      {isPending ? "Saving…" : "Mark Paid"}
    </button>
  );
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
    {
      key: "bill",
      header: "This month",
      accessor: (r) => {
        if (r.total === null) {
          return <span className="text-ink-muted">No bill yet</span>;
        }
        const paid = r.paid ?? 0;
        if (paid >= r.total) {
          return (
            <span className="text-accent">
              ₹{r.total} paid
              {!r.verified && (
                <span className="ml-1 text-amber">· unverified</span>
              )}
            </span>
          );
        }
        if (paid > 0) {
          return (
            <span className="text-amber">
              ₹{paid} of ₹{r.total}
            </span>
          );
        }
        return <span className="text-amber">₹{r.total} unpaid</span>;
      },
      sortValue: (r) => (r.total ?? 0) - (r.paid ?? 0),
      align: "right",
    },
    {
      key: "action",
      header: "",
      accessor: (r) => <MarkPaidCell row={r} />,
      align: "right",
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
