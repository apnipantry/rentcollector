import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { logout } from "@/app/login/actions";

interface OrgRow {
  id: string;
  name: string;
  contact_phone: string | null;
  created_at: string;
  profiles: { full_name: string | null; phone: string | null; role: string }[];
}

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, contact_phone, created_at, profiles(full_name, phone, role)")
    .order("created_at", { ascending: false })
    .returns<OrgRow[]>();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Building Owners
        </h1>
        <div className="flex gap-3">
          <Link
            href="/admin/organizations/new"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Add Owner
          </Link>
          <form action={logout}>
            <button className="text-sm text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Organization</th>
              <th className="px-4 py-2 font-medium">Owner</th>
              <th className="px-4 py-2 font-medium">Contact</th>
              <th className="px-4 py-2 font-medium">Added</th>
            </tr>
          </thead>
          <tbody>
            {organizations?.map((org) => {
              const owner = org.profiles?.find((p) => p.role === "owner");
              return (
                <tr key={org.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-900">{org.name}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {owner?.full_name || (
                      <span className="text-gray-400">No owner yet</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {org.contact_phone || owner?.phone || "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {!organizations?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No building owners yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
