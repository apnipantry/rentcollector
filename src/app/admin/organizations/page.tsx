import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import OrganizationsTable, { type OrgRow } from "./OrganizationsTable";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: organizations } = await supabase
    .from("organizations")
    .select(
      "id, name, contact_phone, created_at, profiles(full_name, phone, role)"
    )
    .order("created_at", { ascending: false })
    .returns<
      {
        id: string;
        name: string;
        contact_phone: string | null;
        created_at: string;
        profiles: { full_name: string | null; phone: string | null; role: string }[];
      }[]
    >();

  const rows: OrgRow[] =
    organizations?.map((org) => {
      const owner = org.profiles?.find((p) => p.role === "owner");
      return {
        id: org.id,
        name: org.name,
        contact_phone: org.contact_phone,
        created_at: org.created_at,
        ownerName: owner?.full_name ?? null,
        ownerPhone: owner?.phone ?? null,
      };
    }) ?? [];

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Building Owners</h1>
        <Link
          href="/admin/organizations/new"
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          + Add Owner
        </Link>
      </div>

      <OrganizationsTable rows={rows} />
    </div>
  );
}
