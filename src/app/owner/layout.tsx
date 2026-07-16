import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import Sidebar from "@/components/Sidebar";

export default async function OwnerLayout({
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
    <div className="flex min-h-screen">
      <Sidebar
        title="RentCollector"
        identity={identity}
        onLogout={logout}
        items={[
          { href: "/owner", label: "Dashboard" },
          { href: "/owner/bills", label: "Bills" },
          { href: "/owner/buildings", label: "Buildings" },
          { href: "/owner/flats", label: "Flats" },
          { href: "/owner/tenants", label: "Tenants" },
          { href: "/owner/caretakers", label: "Caretakers" },
        ]}
      />
      <main className="min-h-screen flex-1 bg-paper">{children}</main>
    </div>
  );
}
