import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import AppShell from "@/components/AppShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let identity: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    identity = profile?.full_name ?? user.email ?? undefined;
  }

  return (
    <AppShell
      title="RentCollector Admin"
      identity={identity}
      onLogout={logout}
      items={[{ href: "/admin/organizations", label: "Building Owners" }]}
    >
      {children}
    </AppShell>
  );
}
