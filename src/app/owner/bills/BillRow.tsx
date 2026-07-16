"use client";

import { useState, useTransition } from "react";
import { updateBillPayment } from "./actions";

export interface OwnerBill {
  id: string;
  ler: number | null;
  cer: number | null;
  ec: number;
  rent: number;
  garbage: number;
  previous: number;
  total: number;
  paid: number;
  mode: string | null;
  difference: number;
  verified: boolean;
  reading_submitted_at: string | null;
  meter_photo_signed_url: string | null;
  flats: { room_no: string; buildings: { name: string } | null } | null;
  tenants: { name: string } | null;
}

export default function BillRow({ bill }: { bill: OwnerBill }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(String(bill.paid ?? 0));
  const [mode, setMode] = useState(bill.mode ?? "");
  const [verified, setVerified] = useState(bill.verified);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await updateBillPayment(formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const settled = bill.difference <= 0 && bill.reading_submitted_at;

  return (
    <form
      action={handleSubmit}
      className={`rounded-lg border p-4 ${
        settled ? "border-line" : "border-amber bg-amber-soft"
      }`}
    >
      <input type="hidden" name="billId" value={bill.id} />

      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="font-medium text-ink">
            Room {bill.flats?.room_no}
            {bill.flats?.buildings?.name
              ? ` · ${bill.flats.buildings.name}`
              : ""}
          </p>
          <p className="text-xs text-ink-muted">{bill.tenants?.name}</p>
        </div>
        {!bill.reading_submitted_at && (
          <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink-muted">
            No reading yet
          </span>
        )}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-ink-muted sm:grid-cols-6">
        <div>
          <p className="text-ink-muted">LER → CER</p>
          <p>
            {bill.ler ?? "—"} → {bill.cer ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-ink-muted">EC</p>
          <p>₹{bill.ec}</p>
        </div>
        <div>
          <p className="text-ink-muted">Rent</p>
          <p>₹{bill.rent}</p>
        </div>
        <div>
          <p className="text-ink-muted">Garbage</p>
          <p>₹{bill.garbage}</p>
        </div>
        <div>
          <p className="text-ink-muted">Previous</p>
          <p>₹{bill.previous}</p>
        </div>
        <div>
          <p className="text-ink-muted">Total</p>
          <p className="font-medium text-ink">₹{bill.total}</p>
        </div>
      </div>

      {bill.meter_photo_signed_url && (
        <a
          href={bill.meter_photo_signed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 inline-block text-xs text-blue-600 hover:underline"
        >
          View meter photo
        </a>
      )}

      {error && (
        <p className="mb-3 rounded bg-red-soft px-3 py-2 text-xs text-red">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-ink-muted">Paid</label>
          <input
            type="number"
            name="paid"
            step="0.01"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            className="mt-1 w-28 rounded border border-line px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-ink-muted">Mode</label>
          <select
            name="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="mt-1 rounded border border-line px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
          </select>
        </div>

        <label className="flex items-center gap-2 pb-2 text-xs text-ink-muted">
          <input
            type="checkbox"
            name="verified"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
          />
          Reading verified
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>

        <p className="ml-auto text-xs text-ink-muted">
          Difference:{" "}
          <span
            className={
              bill.difference > 0 ? "font-medium text-amber" : ""
            }
          >
            ₹{bill.difference}
          </span>
        </p>
      </div>
    </form>
  );
}
