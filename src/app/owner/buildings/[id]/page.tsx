import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DataTable, { type Column } from "@/components/DataTable";

interface FlatRow {
  id: string;
  room_no: string;
  rent: number;
  tenantName: string | null;
}

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: building } = await supabase
    .from("buildings")
    .select("id, name, electricity_rate, garbage_fee")
    .eq("id", id)
    .single();

  const { data: flats } = await supabase
    .from("flats")
    .select("id, room_no, rent, tenants(name, is_active)")
    .eq("building_id", id)
    .order("room_no");

  if (!building) {
    return <div className="p-6 text-sm text-ink-muted">Building not found.</div>;
  }

  const rows: FlatRow[] =
    flats?.map((f) => {
      const activeTenant = (
        f.tenants as unknown as { name: string; is_active: boolean }[]
      )?.find((t) => t.is_active);
      return {
        id: f.id,
        room_no: f.room_no,
        rent: f.rent,
        tenantName: activeTenant?.name ?? null,
      };
    }) ?? [];

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
    <div className="mx-auto max-w-3xl p-8">
      <Link
        href="/owner/buildings"
        className="mb-4 inline-block text-xs text-ink-muted hover:text-ink"
      >
        ← Buildings
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{building.name}</h1>
          <p className="text-xs text-ink-muted">
            ₹{building.electricity_rate}/unit · ₹{building.garbage_fee} garbage
          </p>
        </div>
        <Link
          href={`/owner/buildings/${id}/flats/new`}
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          + Add Flat
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchAccessor={(r) => `${r.room_no} ${r.tenantName ?? ""}`}
        searchPlaceholder="Search flats…"
        rowHref={(r) => `/owner/flats/${r.id}`}
        rowTone={(r) => (r.tenantName ? "default" : "amber")}
        emptyLabel="No flats yet."
      />
    </div>
  );
}
