"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function createCaretaker(formData: FormData) {
  const organizationId = await requireOwnerOrgId();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;

  const admin = createAdminClient();

  // Invite-style: caretaker sets their own password via the emailed link,
  // same pattern as the platform_admin -> owner invite.
  const { data: authUser, error: authError } =
    await admin.auth.admin.inviteUserByEmail(email);

  if (authError || !authUser?.user) {
    redirect(
      `/owner/caretakers/new?error=${encodeURIComponent(
        authError?.message || "Failed to invite caretaker"
      )}`
    );
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    organization_id: organizationId,
    role: "caretaker",
    full_name: name,
    phone: phone || null,
  });

  if (profileError) {
    redirect(
      `/owner/caretakers/new?error=${encodeURIComponent(profileError.message)}`
    );
  }

  redirect("/owner/caretakers");
}
