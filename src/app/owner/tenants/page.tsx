import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import TenantsListTable, { type TenantListRow } from "./TenantsListTable";

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select(
      "id, name, phone, is_active, flat_id, flats(room_no, buildings(name))"
    )
    .order("is_active", { ascending: false })
    .order("name");

  const rows: TenantListRow[] =
    tenants?.map((t) => {
      const flat = t.flats as unknown as {
        room_no: string;
        buildings: { name: string } | null;
      } | null;
      return {
        id: t.id,
        name: t.name,
        phone: t.phone,
        is_active: t.is_active,
        flatId: t.flat_id,
        roomNo: flat?.room_no ?? "—",
        buildingName: flat?.buildings?.name ?? "—",
      };
    }) ?? [];

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Tenants</h1>
        <Link
          href="/owner/tenants/new"
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          + Add Tenant
        </Link>
      </div>

      <TenantsListTable rows={rows} />
    </div>
  );
}
