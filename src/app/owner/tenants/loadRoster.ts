import { createClient } from "@/lib/supabase/server";
import type { BillHistoryRow } from "@/app/owner/flats/[id]/BillHistoryTable";
import type { TenantListRow } from "./TenantsListTable";

export type BuildingOption = { id: string; name: string };

type FlatJoin = {
  id: string;
  room_no: string;
  building_id: string;
  buildings: { id: string; name: string } | null;
};

type TenantRow = {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  flat_id: string;
  flats: FlatJoin | null;
};

type MonthBill = {
  id: string;
  flat_id: string;
  total: number | null;
  paid: number | null;
  mode: string | null;
  verified: boolean | null;
  difference: number | null;
};

type HistoryBill = {
  id: string;
  flat_id: string;
  billing_month: string;
  total: number;
  paid: number;
  difference: number;
  verified: boolean;
  reading_submitted_at: string | null;
  tenants: { name: string } | null;
};

export async function loadBuildings(): Promise<BuildingOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("buildings")
    .select("id, name")
    .order("name");
  return data ?? [];
}

export async function loadTenantRoster({
  buildingId,
  showArchived,
  billingMonth,
}: {
  buildingId: string | null;
  showArchived: boolean;
  billingMonth: string;
}): Promise<{
  rows: TenantListRow[];
  historyByFlatId: Record<string, BillHistoryRow[]>;
}> {
  const supabase = await createClient();

  let flatsQuery = supabase
    .from("flats")
    .select("id, room_no, building_id, buildings(id, name)")
    .order("room_no");

  if (buildingId) {
    flatsQuery = flatsQuery.eq("building_id", buildingId);
  }

  const { data: flats } = await flatsQuery;
  const flatList = (flats ?? []) as unknown as FlatJoin[];
  const flatIds = flatList.map((f) => f.id);
  const flatById = new Map(flatList.map((f) => [f.id, f]));

  if (!flatIds.length) {
    return { rows: [], historyByFlatId: {} };
  }

  let tenantsQuery = supabase
    .from("tenants")
    .select("id, name, phone, is_active, flat_id, flats(id, room_no, building_id, buildings(id, name))")
    .in("flat_id", flatIds)
    .order("is_active", { ascending: false })
    .order("name");

  if (!showArchived) {
    tenantsQuery = tenantsQuery.eq("is_active", true);
  }

  const [{ data: tenants }, { data: monthBills }, { data: historyBills }] =
    await Promise.all([
      tenantsQuery,
      supabase
        .from("monthly_bills")
        .select("id, flat_id, total, paid, mode, verified, difference")
        .eq("billing_month", billingMonth)
        .in("flat_id", flatIds),
      supabase
        .from("monthly_bills")
        .select(
          "id, flat_id, billing_month, total, paid, difference, verified, reading_submitted_at, tenants(name)"
        )
        .in("flat_id", flatIds)
        .order("billing_month", { ascending: false }),
    ]);

  const billByFlatId = new Map(
    ((monthBills ?? []) as MonthBill[]).map((b) => [b.flat_id, b])
  );

  const historyByFlatId: Record<string, BillHistoryRow[]> = {};
  for (const b of (historyBills ?? []) as unknown as HistoryBill[]) {
    const list = historyByFlatId[b.flat_id] ?? [];
    list.push({
      id: b.id,
      billing_month: b.billing_month,
      tenantName: b.tenants?.name ?? "—",
      total: b.total,
      paid: b.paid,
      difference: b.difference,
      verified: b.verified,
      reading_submitted_at: b.reading_submitted_at,
    });
    historyByFlatId[b.flat_id] = list;
  }

  const pendingByFlatId = new Map<string, number>();
  for (const [flatId, bills] of Object.entries(historyByFlatId)) {
    pendingByFlatId.set(
      flatId,
      bills.reduce((sum, b) => sum + (b.difference > 0 ? b.difference : 0), 0)
    );
  }

  function toRow(t: TenantRow): TenantListRow {
    const flat = (t.flats as FlatJoin | null) ?? flatById.get(t.flat_id) ?? null;
    const bill = billByFlatId.get(t.flat_id);
    return {
      id: t.id,
      name: t.name,
      phone: t.phone,
      is_active: t.is_active,
      flatId: t.flat_id,
      roomNo: flat?.room_no ?? "—",
      buildingName: flat?.buildings?.name ?? "—",
      billId: bill?.id ?? null,
      total: bill?.total ?? null,
      paid: bill?.paid ?? null,
      mode: bill?.mode ?? null,
      verified: bill?.verified ?? null,
      difference: bill?.difference ?? null,
      pendingAllTime: pendingByFlatId.get(t.flat_id) ?? 0,
    };
  }

  const tenantRows = ((tenants ?? []) as unknown as TenantRow[]).map(toRow);

  if (!buildingId) {
    return { rows: tenantRows, historyByFlatId };
  }

  const occupiedFlatIds = new Set(
    tenantRows.filter((r) => r.is_active).map((r) => r.flatId)
  );
  const vacantRows: TenantListRow[] = flatList
    .filter((f) => !occupiedFlatIds.has(f.id))
    .map((f) => {
      const bill = billByFlatId.get(f.id);
      return {
        id: `vacant:${f.id}`,
        name: "Vacant",
        phone: null,
        is_active: false,
        flatId: f.id,
        roomNo: f.room_no,
        buildingName: f.buildings?.name ?? "—",
        billId: bill?.id ?? null,
        total: bill?.total ?? null,
        paid: bill?.paid ?? null,
        mode: bill?.mode ?? null,
        verified: bill?.verified ?? null,
        difference: bill?.difference ?? null,
        pendingAllTime: pendingByFlatId.get(f.id) ?? 0,
        vacant: true,
      };
    });

  const rows = [...tenantRows, ...vacantRows].sort((a, b) =>
    a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true })
  );

  return { rows, historyByFlatId };
}
