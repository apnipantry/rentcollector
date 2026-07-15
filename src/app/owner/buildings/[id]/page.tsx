import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

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
    return <div className="p-6 text-sm text-gray-500">Building not found.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link
        href="/owner/buildings"
        className="mb-4 inline-block text-xs text-gray-500 hover:text-gray-700"
      >
        ← Buildings
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {building.name}
          </h1>
          <p className="text-xs text-gray-500">
            ₹{building.electricity_rate}/unit · ₹{building.garbage_fee} garbage
          </p>
        </div>
        <Link
          href={`/owner/buildings/${id}/flats/new`}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Add Flat
        </Link>
      </div>

      <div className="space-y-2">
        {flats?.map((f) => {
          const activeTenant = (
            f.tenants as unknown as { name: string; is_active: boolean }[]
          )?.find((t) => t.is_active);

          return (
            <Link
              key={f.id}
              href={`/owner/flats/${f.id}`}
              className="flex items-center justify-between rounded border border-gray-200 px-4 py-3 hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Room {f.room_no}
                </p>
                <p className="text-xs text-gray-500">
                  {activeTenant?.name ?? "No tenant"}
                </p>
              </div>
              <p className="text-xs text-gray-400">₹{f.rent} rent</p>
            </Link>
          );
        })}
        {!flats?.length && (
          <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
            No flats yet.
          </p>
        )}
      </div>
    </div>
  );
}
