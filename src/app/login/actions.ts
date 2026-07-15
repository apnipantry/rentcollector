"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || null;

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (redirectTo) {
    redirect(redirectTo);
  }

  switch (profile?.role) {
    case "platform_admin":
      redirect("/admin/organizations");
      return;
    case "owner":
      redirect("/owner");
      return;
    case "caretaker":
      redirect("/caretaker");
      return;
    default:
      redirect("/login?error=no-profile");
      return;
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
