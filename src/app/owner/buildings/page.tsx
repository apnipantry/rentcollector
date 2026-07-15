import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function BuildingsPage() {
  const supabase = await createClient();
  const { data: buildings } = await supabase
    .from("buildings")
    .select("id, name, electricity_rate, garbage_fee, flats(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Buildings</h1>
        <Link
          href="/owner/buildings/new"
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Add Building
        </Link>
      </div>

      <div className="space-y-2">
        {buildings?.map((b) => (
          <Link
            key={b.id}
            href={`/owner/buildings/${b.id}`}
            className="flex items-center justify-between rounded border border-gray-200 px-4 py-3 hover:bg-gray-50"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{b.name}</p>
              <p className="text-xs text-gray-500">
                ₹{b.electricity_rate}/unit · ₹{b.garbage_fee} garbage
              </p>
            </div>
            <p className="text-xs text-gray-400">
              {(b.flats as unknown as { count: number }[])?.[0]?.count ?? 0}{" "}
              flats
            </p>
          </Link>
        ))}
        {!buildings?.length && (
          <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
            No buildings yet.
          </p>
        )}
      </div>
    </div>
  );
}
