"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function ensureMonthBills(billingMonth: string) {
  const supabase = await createClient();
  await supabase.rpc("ensure_monthly_bills", {
    p_billing_month: billingMonth,
  });
}

export async function submitOwnerReading(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const flatId = formData.get("flatId") as string;
  const billingMonth = formData.get("billingMonth") as string;
  const cer = formData.get("cer") as string;
  const photo = formData.get("photo") as File | null;

  if (!cer || Number.isNaN(Number(cer))) {
    throw new Error("Enter a valid current reading");
  }

  let meterPhotoUrl: string | null = null;

  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${profile?.organization_id}/${flatId}/${billingMonth}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("meter-photos")
      .upload(path, photo, { upsert: true });

    if (uploadError) {
      throw new Error(`Photo upload failed: ${uploadError.message}`);
    }
    meterPhotoUrl = path;
  }

  const { error: rpcError } = await supabase.rpc("submit_meter_reading", {
    p_flat_id: flatId,
    p_billing_month: billingMonth,
    p_cer: Number(cer),
    p_photo_path: meterPhotoUrl,
  });

  if (rpcError) {
    throw new Error(`Failed to save reading: ${rpcError.message}`);
  }

  revalidatePath("/owner/bills");
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
