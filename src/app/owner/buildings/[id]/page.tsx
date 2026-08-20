import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import TabBar from "@/components/TabBar";
import FlatsTable, { type FlatRow } from "./FlatsTable";
import TenantsListTable from "@/app/owner/tenants/TenantsListTable";
import { currentBillingMonth } from "@/app/owner/bills/utils";
import { loadTenantRoster } from "@/app/owner/tenants/loadRoster";

export default async function BuildingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; archived?: string }>;
}) {
  const { id } = await params;
  const { tab, archived } = await searchParams;
  const activeTab = tab === "flats" ? "flats" : "tenants";
  const showArchived = archived === "1";

  const supabase = await createClient();

  const { data: building } = await supabase
    .from("buildings")
    .select("id, name, electricity_rate, garbage_fee")
    .eq("id", id)
    .single();

  if (!building) {
    return <div className="p-6 text-sm text-ink-muted">Building not found.</div>;
  }

  const flatsTabHref = `/owner/buildings/${id}?tab=flats`;
  const tenantsTabHref = `/owner/buildings/${id}?tab=tenants${
    showArchived ? "&archived=1" : ""
  }`;

  const { data: flats } = await supabase
    .from("flats")
    .select("id, room_no, rent, tenants(name, is_active)")
    .eq("building_id", id)
    .order("room_no");

  const flatsRows: FlatRow[] =
    flats?.map((f) => {
      const activeTenant = (
        f.tenants as unknown as { name: string; is_active: boolean }[]
      )?.find((t) => t.is_active);
      return {
        id: f.id,
        room_no: f.room_no,
        rent: f.rent,
        tenantName: activeTenant?.name ?? null,
      };
    }) ?? [];

  const roster = await loadTenantRoster({
    buildingId: id,
    showArchived,
    billingMonth: currentBillingMonth(),
  });

  const occupied = roster.rows.filter((r) => r.is_active && !r.vacant).length;
  const vacant = roster.rows.filter((r) => r.vacant).length;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <Link
        href="/owner/buildings"
        className="mb-4 inline-block text-xs text-ink-muted hover:text-ink"
      >
        ← Buildings
      </Link>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{building.name}</h1>
          <p className="text-xs text-ink-muted">
            ₹{building.electricity_rate}/unit · ₹{building.garbage_fee} garbage
            {activeTab === "tenants" && ` · ${occupied} occupied · ${vacant} vacant`}
          </p>
        </div>
        {activeTab === "flats" ? (
          <Link
            href={`/owner/buildings/${id}/flats/new`}
            className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
          >
            + Add Flat
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href={
                showArchived
                  ? `/owner/buildings/${id}?tab=tenants`
                  : `/owner/buildings/${id}?tab=tenants&archived=1`
              }
              className="text-xs text-ink-muted hover:text-ink"
            >
              {showArchived ? "Hide moved-out" : "Show moved-out"}
            </Link>
            <Link
              href="/owner/tenants/new"
              className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
            >
              + Add Tenant
            </Link>
          </div>
        )}
      </div>

      <div className="mb-4">
        <TabBar
          items={[
            { href: tenantsTabHref, label: "Tenants", count: occupied + vacant },
            { href: flatsTabHref, label: "Flats", count: flatsRows.length },
          ]}
          activeHref={activeTab === "flats" ? flatsTabHref : tenantsTabHref}
        />
      </div>

      {activeTab === "flats" ? (
        <FlatsTable rows={flatsRows} />
      ) : (
        <>
          <TenantsListTable
            rows={roster.rows}
            hideBuilding
            historyByFlatId={roster.historyByFlatId}
          />
          {roster.rows.length > 0 && (
            <p className="mt-3 text-xs text-ink-muted">
              Click a row to expand that flat&apos;s bill history without
              leaving this page.
            </p>
          )}
        </>
      )}
    </div>
  );
}
