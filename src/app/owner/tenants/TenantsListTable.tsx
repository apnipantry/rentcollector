"use client";

import { useState, useTransition } from "react";
import DataTable, { type Column } from "@/components/DataTable";
import { updateBillPayment } from "@/app/owner/bills/actions";
import { deleteTenant } from "@/app/owner/buildings/actions";

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

function TenantBillCell({ row }: { row: TenantListRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(String(row.paid ?? 0));
  const [mode, setMode] = useState(row.mode ?? "");
  const [verified, setVerified] = useState(row.verified ?? false);

  if (!row.billId || row.total === null) {
    return <span className="text-ink-muted">No bill yet</span>;
  }

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    const formData = new FormData();
    formData.set("billId", row.billId!);
    formData.set("paid", paid);
    formData.set("mode", mode);
    formData.set("verified", verified ? "on" : "");
    startTransition(async () => {
      try {
        await updateBillPayment(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div
      className="flex flex-wrap items-end gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <label className="block text-[10px] text-ink-muted">
          Total ₹{row.total}
        </label>
        <input
          type="number"
          step="0.01"
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
          className="mt-0.5 w-20 rounded border border-line px-2 py-1 text-xs"
        />
      </div>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="rounded border border-line px-2 py-1 text-xs"
      >
        <option value="">Mode —</option>
        <option value="cash">Cash</option>
        <option value="online">Online</option>
      </select>
      <label className="flex items-center gap-1 pb-1 text-[10px] text-ink-muted">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
        />
        Verified
      </label>
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="rounded bg-ink px-2 py-1 text-xs font-medium text-white hover:bg-ink/90 disabled:opacity-50"
      >
        {isPending ? "…" : "Save"}
      </button>
      {error && <p className="w-full text-[10px] text-red">{error}</p>}
    </div>
  );
}

function DeleteTenantCell({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Delete this tenant record? This cannot be undone.")) return;
          setError(null);
          startTransition(async () => {
            try {
              await deleteTenant(id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to delete");
            }
          });
        }}
        className="rounded border border-red px-2 py-1 text-xs font-medium text-red hover:bg-red-soft disabled:opacity-50"
      >
        {isPending ? "…" : "Delete"}
      </button>
      {error && <p className="mt-1 w-24 text-[10px] text-red">{error}</p>}
    </div>
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
      header: "This month's payment",
      accessor: (r) => <TenantBillCell row={r} />,
    },
    {
      key: "actions",
      header: "",
      accessor: (r) => <DeleteTenantCell id={r.id} />,
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
