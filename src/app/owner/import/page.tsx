import ImportClient from "./ImportClient";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="mb-1 text-xl font-semibold text-ink">Bulk import</h1>
      <p className="mb-6 text-sm text-ink/60">
        Onboard buildings, flats, tenants, and historical bills from a spreadsheet.
        Existing bills are never overwritten.
      </p>
      <ImportClient />
    </div>
  );
}
