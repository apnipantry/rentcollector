import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { createFlat } from "@/app/owner/buildings/actions";

export default async function NewFlatPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; buildingId?: string }>;
}) {
  const search = await searchParams;
  const supabase = await createClient();
  const { data: buildings } = await supabase
    .from("buildings")
    .select("id, name")
    .order("name");

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold text-ink">Add Flat</h1>

      {search.error && (
        <p className="mb-4 rounded bg-red-soft px-3 py-2 text-sm text-red">
          {search.error}
        </p>
      )}

      {!buildings?.length ? (
        <p className="rounded border border-line bg-paper p-4 text-sm text-ink-muted">
          Add a building first —{" "}
          <Link href="/owner/buildings/new" className="underline">
            create one here
          </Link>
          .
        </p>
      ) : (
        <form action={createFlat} className="space-y-4">
          <div>
            <label className="block text-sm text-ink">Building</label>
            <select
              name="buildingId"
              required
              defaultValue={search.buildingId ?? ""}
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select a building
              </option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-ink">Room number</label>
            <input
              name="roomNo"
              required
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-ink">Rent (₹/month)</label>
            <input
              type="number"
              step="0.01"
              name="rent"
              required
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-ink py-2 text-sm font-medium text-white hover:bg-ink/90"
          >
            Create
          </button>
        </form>
      )}
    </div>
  );
}
