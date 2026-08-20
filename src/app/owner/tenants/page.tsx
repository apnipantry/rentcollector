import Link from "next/link";
import TabBar from "@/components/TabBar";
import TenantsListTable from "./TenantsListTable";
import { currentBillingMonth } from "@/app/owner/bills/utils";
import { loadBuildings, loadTenantRoster } from "./loadRoster";

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string; building?: string }>;
}) {
  const { archived, building } = await searchParams;
  const showArchived = archived === "1";
  const buildings = await loadBuildings();
  const selectedBuildingId =
    building && buildings.some((b) => b.id === building)
      ? building
      : (buildings[0]?.id ?? null);

  const billingMonth = currentBillingMonth();
  const { rows, historyByFlatId } = await loadTenantRoster({
    buildingId: selectedBuildingId,
    showArchived,
    billingMonth,
  });

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);
  const occupied = rows.filter((r) => r.is_active && !r.vacant).length;
  const vacant = rows.filter((r) => r.vacant).length;
  const unpaid = rows.filter(
    (r) => !r.vacant && r.is_active && (r.difference ?? 0) > 0
  ).length;

  function hrefFor(buildingId: string) {
    const params = new URLSearchParams();
    params.set("building", buildingId);
    if (showArchived) params.set("archived", "1");
    return `/owner/tenants?${params.toString()}`;
  }

  const archivedHref = selectedBuildingId
    ? `/owner/tenants?building=${selectedBuildingId}${
        showArchived ? "" : "&archived=1"
      }`
    : showArchived
      ? "/owner/tenants"
      : "/owner/tenants?archived=1";

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Tenants</h1>
          {selectedBuilding && (
            <p className="text-sm text-ink-muted">
              {occupied} occupied · {vacant} vacant · {unpaid} unpaid this month
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={archivedHref}
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
      </div>

      {buildings.length > 0 && selectedBuildingId && (
        <div className="mb-4">
          <TabBar
            items={buildings.map((b) => ({
              href: hrefFor(b.id),
              label: b.name,
            }))}
            activeHref={hrefFor(selectedBuildingId)}
          />
        </div>
      )}

      <TenantsListTable
        rows={rows}
        hideBuilding
        historyByFlatId={historyByFlatId}
      />
      {rows.length > 0 && (
        <p className="mt-3 text-xs text-ink-muted">
          Click a row to expand that flat&apos;s bill history without leaving
          this page.
        </p>
      )}
    </div>
  );
}
