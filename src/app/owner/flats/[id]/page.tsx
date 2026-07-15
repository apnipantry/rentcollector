import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function FlatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: flat } = await supabase
    .from("flats")
    .select("id, room_no, rent, building_id, buildings(name)")
    .eq("id", id)
    .single();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, phone, move_in_date, is_active")
    .eq("flat_id", id)
    .order("created_at", { ascending: false });

  if (!flat) {
    return <div className="p-6 text-sm text-gray-500">Flat not found.</div>;
  }

  const buildingName = (flat.buildings as unknown as { name: string } | null)
    ?.name;
  const activeTenant = tenants?.find((t) => t.is_active);
  const pastTenants = tenants?.filter((t) => !t.is_active) ?? [];

  return (
    <div className="mx-auto max-w-lg p-6">
      <Link
        href={`/owner/buildings/${flat.building_id}`}
        className="mb-4 inline-block text-xs text-gray-500 hover:text-gray-700"
      >
        ← {buildingName}
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Room {flat.room_no}
          </h1>
          <p className="text-xs text-gray-500">₹{flat.rent} rent</p>
        </div>
        <Link
          href={`/owner/flats/${id}/tenants/new`}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {activeTenant ? "Replace Tenant" : "Add Tenant"}
        </Link>
      </div>

      <div className="mb-6 rounded border border-gray-200 p-4">
        <p className="mb-2 text-xs font-medium uppercase text-gray-400">
          Current tenant
        </p>
        {activeTenant ? (
          <>
            <p className="text-sm font-medium text-gray-900">
              {activeTenant.name}
            </p>
            <p className="text-xs text-gray-500">{activeTenant.phone}</p>
            {activeTenant.move_in_date && (
              <p className="text-xs text-gray-400">
                Since{" "}
                {new Date(activeTenant.move_in_date).toLocaleDateString()}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">Vacant</p>
        )}
      </div>

      {pastTenants.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-gray-400">
            Previous tenants
          </p>
          <div className="space-y-2">
            {pastTenants.map((t) => (
              <div
                key={t.id}
                className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500"
              >
                {t.name} · {t.phone}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
