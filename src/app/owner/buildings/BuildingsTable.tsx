"use client";

import { useState, useTransition } from "react";
import DataTable, { type Column } from "@/components/DataTable";
import { deleteBuilding } from "./actions";

export interface BuildingRow {
  id: string;
  name: string;
  electricity_rate: number;
  garbage_fee: number;
  flatCount: number;
}

function DeleteBuildingCell({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Delete this building? This cannot be undone.")) return;
          setError(null);
          startTransition(async () => {
            try {
              await deleteBuilding(id);
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
    {
      key: "actions",
      header: "",
      accessor: (r) => <DeleteBuildingCell id={r.id} />,
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
