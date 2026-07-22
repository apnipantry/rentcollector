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

  const method = (formData.get("method") as string) || "email";
  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string)?.trim() || "";

  const admin = createAdminClient();

  if (method === "phone") {
    if (!phone) {
      redirect(
        `/owner/caretakers/new?method=phone&error=${encodeURIComponent(
          "Phone number is required"
        )}`
      );
    }

    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      redirect(
        `/owner/caretakers/new?method=phone&error=${encodeURIComponent(
          "A caretaker with this phone number already exists"
        )}`
      );
    }

    // No email or password is ever sent or shown — this account exists
    // only so profiles.id has a valid auth.users row to reference.
    // Login is not possible without a password reset, which is never
    // triggered for phone-only caretakers.
    const syntheticEmail = `caretaker+${crypto.randomUUID()}@wa.internal`;
    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email: syntheticEmail,
        password: crypto.randomUUID() + crypto.randomUUID(),
        email_confirm: true,
      });

    if (authError || !authUser?.user) {
      redirect(
        `/owner/caretakers/new?method=phone&error=${encodeURIComponent(
          authError?.message || "Failed to create caretaker"
        )}`
      );
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: authUser.user.id,
      organization_id: organizationId,
      role: "caretaker",
      full_name: name,
      phone,
    });

    if (profileError) {
      redirect(
        `/owner/caretakers/new?method=phone&error=${encodeURIComponent(
          profileError.message
        )}`
      );
    }

    redirect("/owner/caretakers");
  }

  const email = formData.get("email") as string;

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
