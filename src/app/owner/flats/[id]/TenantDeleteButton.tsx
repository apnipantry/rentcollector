"use client";

import { useState, useTransition } from "react";
import { deleteTenant } from "@/app/owner/buildings/actions";

export default function TenantDeleteButton({ tenantId }: { tenantId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Delete this tenant record? This cannot be undone.")) return;
          setError(null);
          startTransition(async () => {
            try {
              await deleteTenant(tenantId);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to delete");
            }
          });
        }}
        className="rounded border border-red px-2 py-1 text-xs font-medium text-red hover:bg-red-soft disabled:opacity-50"
      >
        {isPending ? "…" : "Delete"}
      </button>
      {error && <p className="mt-1 text-[10px] text-red">{error}</p>}
    </div>
  );
}
