import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { replaceTenant } from "@/app/owner/buildings/actions";

export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; flatId?: string }>;
}) {
  const search = await searchParams;
  const supabase = await createClient();
  const { data: flats } = await supabase
    .from("flats")
    .select("id, room_no, buildings(name), tenants(name, is_active)")
    .order("room_no");

  const flatOptions =
    flats?.map((f) => {
      const activeTenant = (
        f.tenants as unknown as { name: string; is_active: boolean }[]
      )?.find((t) => t.is_active);
      const buildingName =
        (f.buildings as unknown as { name: string } | null)?.name ?? "";
      return {
        id: f.id,
        label: `${buildingName} · Room ${f.room_no}${
          activeTenant ? ` (occupied: ${activeTenant.name})` : " (vacant)"
        }`,
      };
    }) ?? [];

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold text-ink">
        Add / Replace Tenant
      </h1>

      {search.error && (
        <p className="mb-4 rounded bg-red-soft px-3 py-2 text-sm text-red">
          {search.error}
        </p>
      )}

      {!flatOptions.length ? (
        <p className="rounded border border-line bg-paper p-4 text-sm text-ink-muted">
          Add a flat first —{" "}
          <Link href="/owner/flats/new" className="underline">
            create one here
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="mb-4 rounded bg-amber-soft px-3 py-2 text-xs text-amber">
            If the flat you pick already has an active tenant, adding a new one
            will mark the previous tenant as moved out.
          </p>

          <form action={replaceTenant} className="space-y-4">
            <div>
              <label className="block text-sm text-ink">Flat</label>
              <select
                name="flatId"
                required
                defaultValue={search.flatId ?? ""}
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Select a flat
                </option>
                {flatOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-ink">Tenant name</label>
              <input
                name="name"
                required
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-ink">Phone</label>
              <input
                name="phone"
                required
                placeholder="10-digit number or with country code"
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-ink">Move-in date</label>
              <input
                type="date"
                name="moveInDate"
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded bg-ink py-2 text-sm font-medium text-white hover:bg-ink/90"
            >
              Save
            </button>
          </form>
        </>
      )}
    </div>
  );
}
