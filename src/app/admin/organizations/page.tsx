import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DataTable, { type Column } from "@/components/DataTable";

interface OrgRow {
  id: string;
  name: string;
  contact_phone: string | null;
  created_at: string;
  ownerName: string | null;
  ownerPhone: string | null;
}

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

  const columns: Column<OrgRow>[] = [
    {
      key: "name",
      header: "Organization",
      accessor: (r) => <span className="font-medium text-ink">{r.name}</span>,
      sortValue: (r) => r.name.toLowerCase(),
    },
    {
      key: "owner",
      header: "Owner",
      accessor: (r) =>
        r.ownerName || <span className="text-ink-muted">No owner yet</span>,
      sortValue: (r) => r.ownerName?.toLowerCase() ?? "",
    },
    {
      key: "contact",
      header: "Contact",
      accessor: (r) => r.contact_phone || r.ownerPhone || "—",
    },
    {
      key: "added",
      header: "Added",
      accessor: (r) => new Date(r.created_at).toLocaleDateString(),
      sortValue: (r) => r.created_at,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Building Owners</h1>
        <Link
          href="/admin/organizations/new"
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          + Add Owner
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchAccessor={(r) => `${r.name} ${r.ownerName ?? ""}`}
        searchPlaceholder="Search organizations or owners…"
        emptyLabel="No building owners yet."
      />
    </div>
  );
}
