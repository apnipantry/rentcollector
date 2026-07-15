import { createCaretaker } from "../actions";

export default async function NewCaretakerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">
        Add Caretaker
      </h1>

      {params.error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {params.error}
        </p>
      )}

      <form action={createCaretaker} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700">Name</label>
          <input
            name="name"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            They&apos;ll get an email invite to set their own password.
          </p>
        </div>
        <div>
          <label className="block text-sm text-gray-700">Phone</label>
          <input
            name="phone"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Send Invite
        </button>
      </form>
    </div>
  );
}
