import { createFlat } from "@/app/owner/buildings/actions";

export default async function NewFlatPage({
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
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Add Flat</h1>

      {search.error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {search.error}
        </p>
      )}

      <form action={createFlat} className="space-y-4">
        <input type="hidden" name="buildingId" value={id} />
        <div>
          <label className="block text-sm text-gray-700">Room number</label>
          <input
            name="roomNo"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">
            Rent (₹/month)
          </label>
          <input
            type="number"
            step="0.01"
            name="rent"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
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
