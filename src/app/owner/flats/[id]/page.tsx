import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import BillHistoryTable, { type BillHistoryRow } from "./BillHistoryTable";
import { currentBillingMonth, shiftMonth, monthLabel } from "@/app/owner/bills/utils";

export default async function FlatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: flat } = await supabase
    .from("flats")
    .select(
      "id, room_no, rent, building_id, buildings(name, electricity_rate, garbage_fee)"
    )
    .eq("id", id)
    .single();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, phone, move_in_date, is_active")
    .eq("flat_id", id)
    .order("created_at", { ascending: false });

  const { data: bills } = await supabase
    .from("monthly_bills")
    .select(
      "id, billing_month, total, paid, difference, verified, reading_submitted_at, tenants(name)"
    )
    .eq("flat_id", id)
    .order("billing_month", { ascending: false });

  if (!flat) {
    return <div className="p-6 text-sm text-ink-muted">Flat not found.</div>;
  }

  const building = flat.buildings as unknown as {
    name: string;
    electricity_rate: number;
    garbage_fee: number;
  } | null;
  const activeTenant = tenants?.find((t) => t.is_active);
  const pastTenants = tenants?.filter((t) => !t.is_active) ?? [];

  const billRows: BillHistoryRow[] =
    bills?.map((b) => ({
      id: b.id,
      billing_month: b.billing_month,
      tenantName:
        (b.tenants as unknown as { name: string } | null)?.name ?? "—",
      total: b.total,
      paid: b.paid,
      difference: b.difference,
      verified: b.verified,
      reading_submitted_at: b.reading_submitted_at,
    })) ?? [];

  const pending = billRows.reduce(
    (sum, b) => sum + (b.difference > 0 ? b.difference : 0),
    0
  );

  const nextMonth = shiftMonth(currentBillingMonth(), 1);
  const nextMonthFixed = flat.rent + (building?.garbage_fee ?? 0);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link
        href={`/owner/buildings/${flat.building_id}`}
        className="mb-4 inline-block text-xs text-ink-muted hover:text-ink"
      >
        ← {building?.name}
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            Room {flat.room_no}
          </h1>
          <p className="text-xs text-ink-muted">₹{flat.rent} rent</p>
        </div>
        <Link
          href={`/owner/flats/${id}/tenants/new`}
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          {activeTenant ? "Replace Tenant" : "Add Tenant"}
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending (all time)"
          value={`₹${pending.toLocaleString("en-IN")}`}
          tone={pending > 0 ? "amber" : "default"}
        />
        <StatCard
          label={`Due ${monthLabel(nextMonth)} (fixed)`}
          value={`₹${nextMonthFixed.toLocaleString("en-IN")}`}
          sublabel="+ electricity, based on next reading"
        />
      </div>

      <div className="mb-6 rounded border border-line p-4">
        <p className="mb-2 text-xs font-medium uppercase text-ink-muted">
          Current tenant
        </p>
        {activeTenant ? (
          <>
            <p className="text-sm font-medium text-ink">
              {activeTenant.name}
            </p>
            <p className="text-xs text-ink-muted">{activeTenant.phone}</p>
            {activeTenant.move_in_date && (
              <p className="text-xs text-ink-muted">
                Since{" "}
                {new Date(activeTenant.move_in_date).toLocaleDateString()}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-muted">Vacant</p>
        )}
      </div>

      {pastTenants.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase text-ink-muted">
            Previous tenants
          </p>
          <div className="space-y-2">
            {pastTenants.map((t) => (
              <div
                key={t.id}
                className="rounded border border-line bg-paper px-3 py-2 text-xs text-ink-muted"
              >
                {t.name} · {t.phone}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase text-ink-muted">
          Bill history (current + past tenants)
        </p>
        <BillHistoryTable rows={billRows} />
      </div>
    </div>
  );
}
