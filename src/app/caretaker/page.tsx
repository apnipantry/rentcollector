import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { ensureCurrentMonthBills } from "./actions";
import { currentBillingMonth } from "./utils";
import ReadingForm from "./ReadingForm";

export interface Bill {
  id: string;
  flat_id: string;
  billing_month: string;
  ler: number | null;
  cer: number | null;
  reading_submitted_at: string | null;
  meter_photo_url: string | null;
  flats: { room_no: string; buildings: { name: string } | null } | null;
  tenants: { name: string } | null;
}

export default async function CaretakerDashboard() {
  await ensureCurrentMonthBills();

  const supabase = await createClient();
  const billingMonth = currentBillingMonth();

  const { data: bills } = await supabase
    .from("monthly_bills")
    .select(
      `
      id, flat_id, billing_month, ler, cer, reading_submitted_at, meter_photo_url,
      flats ( room_no, buildings ( name ) ),
      tenants ( name )
    `
    )
    .eq("billing_month", billingMonth)
    .order("id")
    .returns<Bill[]>();

  const pending = bills?.filter((b) => !b.reading_submitted_at) ?? [];
  const done = bills?.filter((b) => b.reading_submitted_at) ?? [];

  const monthLabel = new Date(billingMonth).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {monthLabel} Readings
          </h1>
          <p className="text-sm text-gray-500">
            {pending.length} pending · {done.length} submitted
          </p>
        </div>
        <form action={logout}>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            Sign out
          </button>
        </form>
      </div>

      {!bills?.length && (
        <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          No flats found for your account yet. Ask your admin to add flats and
          tenants first.
        </p>
      )}

      <div className="space-y-3">
        {pending.map((bill) => (
          <ReadingForm key={bill.id} bill={bill} />
        ))}
      </div>

      {done.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-medium text-gray-500">
            Already submitted
          </h2>
          <div className="space-y-2">
            {done.map((bill) => (
              <div
                key={bill.id}
                className="rounded border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-500"
              >
                Room {bill.flats?.room_no} — CER {bill.cer}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
