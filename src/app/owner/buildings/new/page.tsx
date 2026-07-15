import { createBuilding } from "../actions";

export default async function NewBuildingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">
        Add Building
      </h1>

      {params.error && (
        <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {params.error}
        </p>
      )}

      <form action={createBuilding} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700">Building name</label>
          <input
            name="name"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">
            Electricity rate (₹ per unit)
          </label>
          <input
            type="number"
            step="0.01"
            name="electricityRate"
            defaultValue={10}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700">
            Garbage fee (₹/month, per flat)
          </label>
          <input
            type="number"
            step="0.01"
            name="garbageFee"
            defaultValue={0}
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
