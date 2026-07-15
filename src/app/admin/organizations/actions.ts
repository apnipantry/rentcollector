"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

async function assertIsPlatformAdmin() {
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

  if (profile?.role !== "platform_admin") {
    redirect("/login?error=not-authorized");
  }
}

export async function createOrganization(formData: FormData) {
  await assertIsPlatformAdmin();

  const orgName = formData.get("orgName") as string;
  const orgContactPhone = formData.get("orgContactPhone") as string;
  const ownerName = formData.get("ownerName") as string;
  const ownerEmail = formData.get("ownerEmail") as string;
  const ownerPhone = formData.get("ownerPhone") as string;

  const admin = createAdminClient();

  // 1. Create the organization
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName, contact_phone: orgContactPhone || null })
    .select()
    .single();

  if (orgError) {
    redirect(
      `/admin/organizations/new?error=${encodeURIComponent(orgError.message)}`
    );
  }

  // 2. Create the owner's auth user (invite-style: they set their own
  // password via the emailed link, rather than us generating one)
  const { data: authUser, error: authError } =
    await admin.auth.admin.inviteUserByEmail(ownerEmail);

  if (authError || !authUser?.user) {
    // Roll back the organization so we don't leave an orphaned row
    await admin.from("organizations").delete().eq("id", org.id);
    redirect(
      `/admin/organizations/new?error=${encodeURIComponent(
        authError?.message || "Failed to invite owner"
      )}`
    );
  }

  // 3. Create the profile row linking the user to this org as 'owner'
  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    organization_id: org.id,
    role: "owner",
    full_name: ownerName,
    phone: ownerPhone || null,
  });

  if (profileError) {
    redirect(
      `/admin/organizations/new?error=${encodeURIComponent(
        profileError.message
      )}`
    );
  }

  redirect("/admin/organizations");
}
