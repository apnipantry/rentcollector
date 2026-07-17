// Shared between the template generator (route.ts) and the client-side
// parser/validator (ImportClient.tsx) so the columns the template ships
// with and the columns the parser reads can never drift apart.

export const SHEET_NAMES = {
  buildings: "Buildings",
  flatsTenants: "Flats & Tenants",
  bills: "Bills History",
} as const;

// Column order doubles as the header row written into the template.
export const BUILDING_COLUMNS = [
  "building_key",
  "name",
  "electricity_rate",
  "garbage_fee",
] as const;

export const FLAT_TENANT_COLUMNS = [
  "flat_key",
  "building_key",
  "room_no",
  "rent",
  "tenant_name",
  "tenant_phone",
  "move_in_date",
] as const;

export const BILL_COLUMNS = [
  "flat_key",
  "billing_month",
  "ler",
  "cer",
  "rent",
  "garbage",
  "electricity_rate",
  "previous",
  "paid",
  "mode",
  "verified",
] as const;

// ---------- Payload shape sent to the bulk_import_org_data RPC ----------

export interface ImportPayload {
  buildings: {
    key: string;
    name: string;
    electricity_rate?: number;
    garbage_fee?: number;
  }[];
  flats: {
    key: string;
    building_key: string;
    room_no: string;
    rent?: number;
  }[];
  tenants: {
    flat_key: string;
    name: string;
    phone: string;
    move_in_date?: string;
  }[];
  bills: {
    flat_key: string;
    billing_month: string;
    ler?: number;
    cer?: number;
    rent?: number;
    garbage?: number;
    electricity_rate?: number;
    previous?: number;
    paid?: number;
    mode?: string;
    verified?: boolean;
  }[];
}

export interface ParseError {
  sheet: string;
  row: number; // 1-indexed data row (excluding header), for the user
  field?: string;
  message: string;
}

export interface ParseResult {
  payload: ImportPayload;
  errors: ParseError[];
  // Counts for the preview screen, before anything is submitted.
  counts: { buildings: number; flats: number; tenants: number; bills: number };
}

// Same normalization used in owner/buildings/actions.ts replaceTenant() —
// duplicated here rather than imported since that file is a "use server"
// action module and can't be imported into client-side parsing code.
export function normalizePhone(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  return digits;
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function asNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// Excel stores dates as serial numbers or strings depending on cell
// formatting; the template ships billing_month/move_in_date columns
// formatted as text so this mostly normalizes "2026-1-1" -> "2026-01-01",
// but also handles the serial-number case if a user reformats the cell.
function asDateString(v: unknown): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") {
    // Excel serial date (days since 1899-12-30).
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

export function parseWorkbookRows(
  buildingsRows: Record<string, unknown>[],
  flatsTenantsRows: Record<string, unknown>[],
  billsRows: Record<string, unknown>[]
): ParseResult {
  const errors: ParseError[] = [];
  const buildingKeys = new Set<string>();
  const flatKeys = new Set<string>();

  const buildings: ImportPayload["buildings"] = [];
  buildingsRows.forEach((row, i) => {
    const key = asString(row.building_key);
    const name = asString(row.name);
    if (!key || !name) {
      errors.push({
        sheet: SHEET_NAMES.buildings,
        row: i + 1,
        message: "building_key and name are both required",
      });
      return;
    }
    if (buildingKeys.has(key)) {
      errors.push({
        sheet: SHEET_NAMES.buildings,
        row: i + 1,
        field: "building_key",
        message: `duplicate building_key "${key}"`,
      });
      return;
    }
    buildingKeys.add(key);
    buildings.push({
      key,
      name,
      electricity_rate: asNumber(row.electricity_rate),
      garbage_fee: asNumber(row.garbage_fee),
    });
  });

  const flats: ImportPayload["flats"] = [];
  const tenants: ImportPayload["tenants"] = [];
  flatsTenantsRows.forEach((row, i) => {
    const key = asString(row.flat_key);
    const buildingKey = asString(row.building_key);
    const roomNo = asString(row.room_no);
    if (!key || !buildingKey || !roomNo) {
      errors.push({
        sheet: SHEET_NAMES.flatsTenants,
        row: i + 1,
        message: "flat_key, building_key, and room_no are all required",
      });
      return;
    }
    if (!buildingKeys.has(buildingKey)) {
      errors.push({
        sheet: SHEET_NAMES.flatsTenants,
        row: i + 1,
        field: "building_key",
        message: `building_key "${buildingKey}" doesn't match any row in ${SHEET_NAMES.buildings}`,
      });
      return;
    }
    if (flatKeys.has(key)) {
      errors.push({
        sheet: SHEET_NAMES.flatsTenants,
        row: i + 1,
        field: "flat_key",
        message: `duplicate flat_key "${key}"`,
      });
      return;
    }
    flatKeys.add(key);
    flats.push({
      key,
      building_key: buildingKey,
      room_no: roomNo,
      rent: asNumber(row.rent),
    });

    const tenantName = asString(row.tenant_name);
    const tenantPhoneRaw = asString(row.tenant_phone);
    if (tenantName || tenantPhoneRaw) {
      if (!tenantName || !tenantPhoneRaw) {
        errors.push({
          sheet: SHEET_NAMES.flatsTenants,
          row: i + 1,
          message: "tenant_name and tenant_phone must both be filled in, or both left blank",
        });
        return;
      }
      const phone = normalizePhone(tenantPhoneRaw);
      if (phone.length !== 12) {
        errors.push({
          sheet: SHEET_NAMES.flatsTenants,
          row: i + 1,
          field: "tenant_phone",
          message: `"${tenantPhoneRaw}" doesn't look like a valid 10-digit phone number`,
        });
        return;
      }
      tenants.push({
        flat_key: key,
        name: tenantName,
        phone,
        move_in_date: asDateString(row.move_in_date),
      });
    }
  });

  const bills: ImportPayload["bills"] = [];
  billsRows.forEach((row, i) => {
    const flatKey = asString(row.flat_key);
    const billingMonthRaw = row.billing_month;
    if (!flatKey || !billingMonthRaw) {
      errors.push({
        sheet: SHEET_NAMES.bills,
        row: i + 1,
        message: "flat_key and billing_month are both required",
      });
      return;
    }
    if (!flatKeys.has(flatKey)) {
      errors.push({
        sheet: SHEET_NAMES.bills,
        row: i + 1,
        field: "flat_key",
        message: `flat_key "${flatKey}" doesn't match any row in ${SHEET_NAMES.flatsTenants}`,
      });
      return;
    }
    const billingMonth = asDateString(billingMonthRaw);
    if (!billingMonth) {
      errors.push({
        sheet: SHEET_NAMES.bills,
        row: i + 1,
        field: "billing_month",
        message: `"${billingMonthRaw}" isn't a recognizable date — use YYYY-MM-01`,
      });
      return;
    }
    const mode = asString(row.mode) || undefined;
    if (mode && mode !== "cash" && mode !== "online") {
      errors.push({
        sheet: SHEET_NAMES.bills,
        row: i + 1,
        field: "mode",
        message: `mode must be "cash" or "online" (or left blank), got "${mode}"`,
      });
      return;
    }
    const verifiedRaw = asString(row.verified).toLowerCase();
    bills.push({
      flat_key: flatKey,
      billing_month: billingMonth,
      ler: asNumber(row.ler),
      cer: asNumber(row.cer),
      rent: asNumber(row.rent),
      garbage: asNumber(row.garbage),
      electricity_rate: asNumber(row.electricity_rate),
      previous: asNumber(row.previous),
      paid: asNumber(row.paid),
      mode,
      verified: verifiedRaw === "true" || verifiedRaw === "yes" || verifiedRaw === "1",
    });
  });

  return {
    payload: { buildings, flats, tenants, bills },
    errors,
    counts: {
      buildings: buildings.length,
      flats: flats.length,
      tenants: tenants.length,
      bills: bills.length,
    },
  };
}
