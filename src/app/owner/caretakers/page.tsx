import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function CaretakersPage() {
  const supabase = await createClient();
  const { data: caretakers } = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("role", "caretaker")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Caretakers</h1>
        <Link
          href="/owner/caretakers/new"
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Add Caretaker
        </Link>
      </div>

      <div className="space-y-2">
        {caretakers?.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded border border-gray-200 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {c.full_name}
              </p>
              <p className="text-xs text-gray-500">{c.phone || "—"}</p>
            </div>
            <p className="text-xs text-gray-400">
              Added {new Date(c.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        {!caretakers?.length && (
          <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
            No caretakers added yet.
          </p>
        )}
      </div>
    </div>
  );
}
