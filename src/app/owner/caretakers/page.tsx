import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import CaretakersTable, { type CaretakerRow } from "./CaretakersTable";

export default async function CaretakersPage() {
  const supabase = await createClient();
  const { data: caretakers } = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("role", "caretaker")
    .order("created_at", { ascending: false });

  const rows: CaretakerRow[] = caretakers ?? [];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Caretakers</h1>
        <Link
          href="/owner/caretakers/new"
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          + Add Caretaker
        </Link>
      </div>

      <CaretakersTable rows={rows} />
    </div>
  );
}
