import { createOrganization } from "../actions";

export default async function NewOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">
        Add Building Owner
      </h1>

      {params.error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {params.error}
        </p>
      )}

      <form action={createOrganization} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-2 text-sm font-medium text-gray-900">
            Organization
          </legend>
          <div>
            <label className="block text-sm text-gray-700">
              Building group / owner name
            </label>
            <input
              name="orgName"
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">
              Contact phone
            </label>
            <input
              name="orgContactPhone"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-sm font-medium text-gray-900">
            First Owner Login
          </legend>
          <div>
            <label className="block text-sm text-gray-700">Owner name</label>
            <input
              name="ownerName"
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Owner email</label>
            <input
              type="email"
              name="ownerEmail"
              required
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              They&apos;ll get an email invite to set their own password.
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Owner phone</label>
            <input
              name="ownerPhone"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Create
        </button>
      </form>
    </div>
  );
}
