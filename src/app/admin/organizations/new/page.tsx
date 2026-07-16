import { createOrganization } from "../actions";

export default async function NewOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="mb-6 text-xl font-semibold text-ink">
        Add Building Owner
      </h1>

      {params.error && (
        <p className="mb-4 rounded bg-red-soft px-3 py-2 text-sm text-red">
          {params.error}
        </p>
      )}

      <form action={createOrganization} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-2 text-sm font-medium text-ink">
            Organization
          </legend>
          <div>
            <label className="block text-sm text-ink">
              Building group / owner name
            </label>
            <input
              name="orgName"
              required
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-ink">
              Contact phone
            </label>
            <input
              name="orgContactPhone"
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-sm font-medium text-ink">
            First Owner Login
          </legend>
          <div>
            <label className="block text-sm text-ink">Owner name</label>
            <input
              name="ownerName"
              required
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-ink">Owner email</label>
            <input
              type="email"
              name="ownerEmail"
              required
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-ink-muted">
              They&apos;ll get an email invite to set their own password.
            </p>
          </div>
          <div>
            <label className="block text-sm text-ink">Owner phone</label>
            <input
              name="ownerPhone"
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded bg-ink py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          Create
        </button>
      </form>
    </div>
  );
}
