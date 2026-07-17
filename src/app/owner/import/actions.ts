"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ImportPayload } from "./utils";

export interface SubmitResult {
  ok: boolean;
  message: string;
  counts?: {
    buildings_created: number;
    flats_created: number;
    tenants_created: number;
    bills_created: number;
  };
}

export async function submitBulkImport(
  payload: ImportPayload
): Promise<SubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") {
    redirect("/login?error=not-authorized");
  }

  const { data, error } = await supabase.rpc("bulk_import_org_data", {
    p_payload: payload,
  });

  if (error) {
    // bulk_import_org_data raises a single exception whose message is a
    // JSON-encoded array of { sheet, flat_key/key, error } objects when
    // validation fails inside Postgres (duplicate bill months, unknown
    // keys, etc.) — try to surface that as readable text; fall back to
    // the raw message if it isn't parseable JSON for some reason.
    try {
      const parsed = JSON.parse(error.message);
      if (Array.isArray(parsed)) {
        const lines = parsed
          .map(
            (e: { sheet?: string; error?: string; flat_key?: string; key?: string; billing_month?: string }) =>
              `[${e.sheet ?? "?"}] ${e.flat_key ?? e.key ?? ""}${
                e.billing_month ? ` (${e.billing_month})` : ""
              }: ${e.error ?? "invalid"}`
          )
          .join("\n");
        return { ok: false, message: lines };
      }
    } catch {
      // not JSON — fall through
    }
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: "Import complete.",
    counts: data as SubmitResult["counts"],
  };
}
