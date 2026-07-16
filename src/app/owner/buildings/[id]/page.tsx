import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import FlatsTable, { type FlatRow } from "./FlatsTable";

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

      <FlatsTable rows={rows} />
    </div>
  );
}
