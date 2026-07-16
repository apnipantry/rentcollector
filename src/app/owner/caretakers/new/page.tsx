import { createCaretaker } from "../actions";

export default async function NewCaretakerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold text-ink">
        Add Caretaker
      </h1>

      {params.error && (
        <p className="mb-4 rounded bg-red-soft px-3 py-2 text-sm text-red">
          {params.error}
        </p>
      )}

      <form action={createCaretaker} className="space-y-4">
        <div>
          <label className="block text-sm text-ink">Name</label>
          <input
            name="name"
            required
            className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-ink">Email</label>
          <input
            type="email"
            name="email"
            required
            className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-ink-muted">
            They&apos;ll get an email invite to set their own password.
          </p>
        </div>
        <div>
          <label className="block text-sm text-ink">Phone</label>
          <input
            name="phone"
            className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-ink py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          Send Invite
        </button>
      </form>
    </div>
  );
}
