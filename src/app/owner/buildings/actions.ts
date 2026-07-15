"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function requireOwnerOrgId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner" || !profile.organization_id) {
    redirect("/login?error=not-authorized");
  }

  return profile.organization_id;
}

export async function createBuilding(formData: FormData) {
  const organizationId = await requireOwnerOrgId();
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const electricityRate = formData.get("electricityRate") as string;
  const garbageFee = formData.get("garbageFee") as string;

  const { error } = await supabase.from("buildings").insert({
    organization_id: organizationId,
    name,
    electricity_rate: Number(electricityRate) || 10,
    garbage_fee: Number(garbageFee) || 0,
  });

  if (error) {
    redirect(`/owner/buildings/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/owner/buildings");
}

export async function createFlat(formData: FormData) {
  await requireOwnerOrgId();
  const supabase = await createClient();

  const buildingId = formData.get("buildingId") as string;
  const roomNo = formData.get("roomNo") as string;
  const rent = formData.get("rent") as string;

  const { error } = await supabase.from("flats").insert({
    building_id: buildingId,
    room_no: roomNo,
    rent: Number(rent) || 0,
  });

  if (error) {
    redirect(
      `/owner/buildings/${buildingId}/flats/new?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  redirect(`/owner/buildings/${buildingId}`);
}

export async function replaceTenant(formData: FormData) {
  await requireOwnerOrgId();
  const supabase = await createClient();

  const flatId = formData.get("flatId") as string;
  const name = formData.get("name") as string;
  const rawPhone = formData.get("phone") as string;
  const moveInDate = formData.get("moveInDate") as string;

  // Normalize to E.164-ish (91XXXXXXXXXX): strip everything but digits,
  // then add the country code if it looks like a bare 10-digit number.
  const digits = rawPhone.replace(/\D/g, "");
  const phone =
    digits.length === 10
      ? `91${digits}`
      : digits.startsWith("91") && digits.length === 12
      ? digits
      : digits;

  const { error } = await supabase.rpc("replace_tenant", {
    p_flat_id: flatId,
    p_name: name,
    p_phone: phone,
    p_move_in_date: moveInDate || null,
  });

  if (error) {
    redirect(
      `/owner/flats/${flatId}/tenants/new?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  redirect(`/owner/flats/${flatId}`);
}
