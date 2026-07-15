"use client";

import { useRef, useState, useTransition } from "react";
import { submitReading } from "./actions";
import type { Bill } from "./page";

export default function ReadingForm({ bill }: { bill: Bill }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await submitReading(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded-lg border border-gray-200 p-4"
    >
      <input type="hidden" name="flatId" value={bill.flat_id} />
      <input type="hidden" name="billingMonth" value={bill.billing_month} />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900">
            Room {bill.flats?.room_no}
            {bill.flats?.buildings?.name
              ? ` · ${bill.flats.buildings.name}`
              : ""}
          </p>
          <p className="text-xs text-gray-500">{bill.tenants?.name}</p>
        </div>
        <p className="text-xs text-gray-500">
          Last reading: {bill.ler ?? "—"}
        </p>
      </div>

      {error && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-600">
            Current reading
          </label>
          <input
            type="number"
            name="cer"
            step="0.01"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <label className="cursor-pointer rounded border border-gray-300 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
          {photoName ? "Photo added" : "Add photo"}
          <input
            type="file"
            name="photo"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
          />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
