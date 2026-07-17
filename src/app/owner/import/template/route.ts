import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import {
  SHEET_NAMES,
  BUILDING_COLUMNS,
  FLAT_TENANT_COLUMNS,
  BILL_COLUMNS,
} from "../utils";

// Sample rows so the owner sees exactly what each column expects, not just
// a blank header row. They're plain example data — not written by anyone
// filling out the sheet, and the parser doesn't treat row 2 specially, so
// the owner needs to delete/overwrite these before uploading.
const BUILDING_SAMPLE = [
  "b1",
  "Sunrise Apartments",
  10,
  50,
];

const FLAT_TENANT_SAMPLE = [
  "f1",
  "b1",
  "101",
  8000,
  "Ravi Kumar",
  "9876543210",
  "2024-01-01",
];

const BILL_SAMPLE = [
  "f1",
  "2026-01-01",
  120,
  150,
  8000,
  50,
  10,
  0,
  8500,
  "cash",
  "true",
];

function sheetFromColumns(columns: readonly string[], sample: (string | number)[]) {
  return XLSX.utils.aoa_to_sheet([[...columns], sample]);
}

export async function GET() {
  // Auth-gate the template the same way the RPC gates the actual import —
  // no reason to expose this to a logged-out request even though it
  // contains no org-specific data.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Not authenticated", { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") {
    return new Response("Not authorized", { status: 403 });
  }

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromColumns(BUILDING_COLUMNS, BUILDING_SAMPLE),
    SHEET_NAMES.buildings
  );
  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromColumns(FLAT_TENANT_COLUMNS, FLAT_TENANT_SAMPLE),
    SHEET_NAMES.flatsTenants
  );
  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromColumns(BILL_COLUMNS, BILL_SAMPLE),
    SHEET_NAMES.bills
  );

  // A short instructions sheet up front — put last in the tab order isn't
  // right either; put it first so it's the first thing the owner sees.
  const instructions = XLSX.utils.aoa_to_sheet([
    ["RentCollector bulk import template"],
    [""],
    ["1. Buildings: one row per building. building_key is any short code you make up —"],
    ["   just needs to match what you type into building_key on the Flats & Tenants tab."],
    ["2. Flats & Tenants: one row per flat. Leave tenant_name/tenant_phone blank if the"],
    ["   flat has no current tenant. flat_key is any short code you make up — must match"],
    ["   what you type into flat_key on the Bills History tab."],
    ["3. Bills History: one row per flat per past month you want to backfill. Only"],
    ["   include months that don't already exist in the app for that flat — the import"],
    ["   will reject (and won't overwrite) any month that's already there."],
    [""],
    ["Delete the example row (row 2) on each tab before filling in your real data."],
    ["billing_month and move_in_date: use YYYY-MM-DD format."],
    ["mode: \"cash\" or \"online\", or leave blank."],
    ["verified: \"true\" or \"false\", or leave blank (defaults to false)."],
  ]);
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  // Move Instructions to the front.
  workbook.SheetNames.unshift(workbook.SheetNames.splice(-1, 1)[0]);

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="rentcollector-import-template.xlsx"',
    },
  });
}
