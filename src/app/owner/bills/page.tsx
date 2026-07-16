import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import Link from "next/link";
import { ensureMonthBills } from "./actions";
import { currentBillingMonth, monthLabel, shiftMonth } from "./utils";
import BillRow, { type OwnerBill } from "./BillRow";

export default async function OwnerBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const billingMonth = month ?? currentBillingMonth();
  const isCurrentMonth = billingMonth === currentBillingMonth();

  // Only auto-create bill rows when looking at the actual current month —
  // browsing past months shouldn't spawn phantom rows for it.
  if (isCurrentMonth) {
    await ensureMonthBills(billingMonth);
  }

  const supabase = await createClient();

  const { data: bills } = await supabase
    .from("monthly_bills")
    .select(
      `
      id, ler, cer, ec, rent, garbage, previous, total, paid, mode,
      difference, verified, reading_submitted_at, meter_photo_url,
      flats ( room_no, buildings ( name ) ),
      tenants ( name )
    `
    )
    .eq("billing_month", billingMonth)
    .order("id")
    .returns<
      (Omit<OwnerBill, "meter_photo_signed_url"> & {
        meter_photo_url: string | null;
      })[]
    >();

  const withSignedUrls: OwnerBill[] = await Promise.all(
    (bills ?? []).map(async (b) => {
      let signedUrl: string | null = null;
      if (b.meter_photo_url) {
        const { data } = await supabase.storage
          .from("meter-photos")
          .createSignedUrl(b.meter_photo_url, 60 * 10);
        signedUrl = data?.signedUrl ?? null;
      }
      return { ...b, meter_photo_signed_url: signedUrl };
    })
  );

  const unresolved = withSignedUrls.filter(
    (b) => b.difference > 0 || !b.reading_submitted_at
  );
  const settled = withSignedUrls.filter(
    (b) => b.difference <= 0 && b.reading_submitted_at
  );
  const unverified = withSignedUrls.filter((b) => !b.verified).length;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {monthLabel(billingMonth)} Bills
          </h1>
          <p className="text-sm text-gray-500">
            {unresolved.length} unpaid/pending · {settled.length} settled ·{" "}
            {unverified} unverified
          </p>
        </div>
        <form action={logout}>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            Sign out
          </button>
        </form>
      </div>

      <div className="mb-6 flex items-center justify-between text-sm">
        <Link
          href={`/owner/bills?month=${shiftMonth(billingMonth, -1)}`}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Previous month
        </Link>
        {!isCurrentMonth && (
          <Link
            href="/owner/bills"
            className="text-gray-600 hover:text-gray-900"
          >
            Back to current month
          </Link>
        )}
        <Link
          href={`/owner/bills?month=${shiftMonth(billingMonth, 1)}`}
          className="text-gray-600 hover:text-gray-900"
        >
          Next month →
        </Link>
      </div>

      {!withSignedUrls.length && (
        <p className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          No bills for this month yet.
        </p>
      )}

      <div className="space-y-3">
        {unresolved.map((bill) => (
          <BillRow key={bill.id} bill={bill} />
        ))}
      </div>

      {settled.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-medium text-gray-500">Settled</h2>
          <div className="space-y-3">
            {settled.map((bill) => (
              <BillRow key={bill.id} bill={bill} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
