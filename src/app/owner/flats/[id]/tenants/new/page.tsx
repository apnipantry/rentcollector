import { replaceTenant } from "@/app/owner/buildings/actions";

export default async function NewTenantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const search = await searchParams;

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">
        Add / Replace Tenant
      </h1>

      {search.error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {search.error}
        </p>
      )}

      <p className="mb-4 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
        If this flat currently has an active tenant, adding a new one will
        mark the previous tenant as moved out.
      </p>

      <form action={replaceTenant} className="space-y-4">
        <input type="hidden" name="flatId" value={id} />
        <div>
          <label className="block text-sm text-gray-700">Tenant name</label>
          <input
            name="name"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Phone</label>
          <input
            name="phone"
            required
            placeholder="10-digit number or with country code"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">
            Move-in date
          </label>
          <input
            type="date"
            name="moveInDate"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Save
        </button>
      </form>
    </div>
  );
}
