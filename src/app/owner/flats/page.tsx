import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import FlatsListTable, { type FlatListRow } from "./FlatsListTable";

export default async function FlatsPage() {
  const supabase = await createClient();
  const { data: flats } = await supabase
    .from("flats")
    .select("id, room_no, rent, buildings(name), tenants(name, is_active)")
    .order("room_no");

  const rows: FlatListRow[] =
    flats?.map((f) => {
      const activeTenant = (
        f.tenants as unknown as { name: string; is_active: boolean }[]
      )?.find((t) => t.is_active);
      return {
        id: f.id,
        room_no: f.room_no,
        rent: f.rent,
        buildingName:
          (f.buildings as unknown as { name: string } | null)?.name ?? "—",
        tenantName: activeTenant?.name ?? null,
      };
    }) ?? [];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Flats</h1>
        <Link
          href="/owner/flats/new"
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          + Add Flat
        </Link>
      </div>

      <FlatsListTable rows={rows} />
    </div>
  );
}
