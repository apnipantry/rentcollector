import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import { currentBillingMonth, monthLabel } from "./bills/utils";

export default async function OwnerDashboard() {
  const supabase = await createClient();
  const billingMonth = currentBillingMonth();

  const [{ count: buildingCount }, { count: flatCount }, { data: bills }] =
    await Promise.all([
      supabase
        .from("buildings")
        .select("id", { count: "exact", head: true }),
      supabase.from("flats").select("id", { count: "exact", head: true }),
      supabase
        .from("monthly_bills")
        .select("total, paid, difference, verified, reading_submitted_at")
        .eq("billing_month", billingMonth),
    ]);

  const unresolved =
    bills?.filter((b) => b.difference > 0 || !b.reading_submitted_at)
      .length ?? 0;
  const unverified = bills?.filter((b) => !b.verified).length ?? 0;
  const collected =
    bills?.reduce((sum, b) => sum + (Number(b.paid) || 0), 0) ?? 0;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
        <p className="text-sm text-ink-muted">{monthLabel(billingMonth)}</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Buildings" value={buildingCount ?? 0} />
        <StatCard label="Flats" value={flatCount ?? 0} />
        <StatCard
          label="Unpaid / pending"
          value={unresolved}
          tone={unresolved > 0 ? "amber" : "default"}
        />
        <StatCard
          label="Unverified readings"
          value={unverified}
          tone={unverified > 0 ? "amber" : "default"}
        />
      </div>

      <div className="mb-8">
        <StatCard
          label="Collected this month"
          value={`₹${collected.toLocaleString("en-IN")}`}
          tone="accent"
        />
      </div>

      <div className="flex gap-3 text-sm">
        <Link
          href="/owner/bills"
          className="rounded bg-ink px-4 py-2 font-medium text-white hover:bg-ink/90"
        >
          Review bills →
        </Link>
        <Link
          href="/owner/buildings"
          className="rounded border border-line bg-surface px-4 py-2 font-medium text-ink hover:bg-paper"
        >
          Manage buildings
        </Link>
      </div>
    </div>
  );
}
