"use client";

import { useState, useTransition } from "react";
import DataTable, { type Column } from "@/components/DataTable";
import { deleteFlat } from "@/app/owner/buildings/actions";

export interface FlatRow {
  id: string;
  room_no: string;
  rent: number;
  tenantName: string | null;
}

function DeleteFlatCell({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Delete this flat? This cannot be undone.")) return;
          setError(null);
          startTransition(async () => {
            try {
              await deleteFlat(id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to delete");
            }
          });
        }}
        className="rounded border border-red px-2 py-1 text-xs font-medium text-red hover:bg-red-soft disabled:opacity-50"
      >
        {isPending ? "…" : "Delete"}
      </button>
      {error && <p className="mt-1 text-[10px] text-red">{error}</p>}
    </div>
  );
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
    {
      key: "actions",
      header: "",
      accessor: (r) => <DeleteFlatCell id={r.id} />,
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
