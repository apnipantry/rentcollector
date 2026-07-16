"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function ensureMonthBills(billingMonth: string) {
  const supabase = await createClient();
  await supabase.rpc("ensure_monthly_bills", {
    p_billing_month: billingMonth,
  });
}

export async function updateBillPayment(formData: FormData) {
  const supabase = await createClient();

  const billId = formData.get("billId") as string;
  const paidRaw = formData.get("paid") as string;
  const mode = (formData.get("mode") as string) || null;
  const verified = formData.get("verified") === "on";

  const paid = Number(paidRaw);
  if (paidRaw !== "" && Number.isNaN(paid)) {
    throw new Error("Enter a valid paid amount");
  }

  const { error } = await supabase.rpc("owner_update_bill", {
    p_bill_id: billId,
    p_paid: paidRaw === "" ? 0 : paid,
    p_mode: mode,
    p_verified: verified,
  });

  if (error) {
    throw new Error(`Failed to save: ${error.message}`);
  }

  revalidatePath("/owner/bills");
}
