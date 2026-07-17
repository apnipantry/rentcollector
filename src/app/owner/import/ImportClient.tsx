"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  SHEET_NAMES,
  parseWorkbookRows,
  type ImportPayload,
  type ParseError,
} from "./utils";
import { submitBulkImport, type SubmitResult } from "./actions";

type Stage = "pick" | "preview" | "submitting" | "done";

export default function ImportClient() {
  const [stage, setStage] = useState<Stage>("pick");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [counts, setCounts] = useState<{
    buildings: number;
    flats: number;
    tenants: number;
    bills: number;
  } | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });

    const sheetRows = (name: string) => {
      const sheet = workbook.Sheets[name];
      if (!sheet) return [];
      return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
    };

    const missing = Object.values(SHEET_NAMES).filter(
      (name) => !workbook.Sheets[name]
    );
    if (missing.length > 0) {
      setErrors([
        {
          sheet: "Workbook",
          row: 0,
          message: `Missing expected sheet(s): ${missing.join(
            ", "
          )}. Did you edit the tab names? Re-download the template if unsure.`,
        },
      ]);
      setStage("preview");
      return;
    }

    const parsed = parseWorkbookRows(
      sheetRows(SHEET_NAMES.buildings),
      sheetRows(SHEET_NAMES.flatsTenants),
      sheetRows(SHEET_NAMES.bills)
    );

    setErrors(parsed.errors);
    setPayload(parsed.payload);
    setCounts(parsed.counts);
    setStage("preview");
  }

  async function handleSubmit() {
    if (!payload) return;
    setStage("submitting");
    const res = await submitBulkImport(payload);
    setResult(res);
    setStage("done");
  }

  function reset() {
    setStage("pick");
    setFileName(null);
    setErrors([]);
    setPayload(null);
    setCounts(null);
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <div className="rounded border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">1. Download the template</h2>
        <p className="mb-3 text-sm text-ink/60">
          Three tabs: Buildings, Flats &amp; Tenants, Bills History. Instructions are
          on the first tab.
        </p>
        <a
          href="/owner/import/template"
          className="inline-block rounded bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          Download template (.xlsx)
        </a>
      </div>

      <div className="rounded border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">2. Upload your filled-in copy</h2>
        <p className="mb-3 text-sm text-ink/60">
          Nothing is saved until you review the preview below and confirm.
        </p>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="text-sm"
        />
        {fileName && (
          <p className="mt-2 text-xs text-ink/50">Selected: {fileName}</p>
        )}
      </div>

      {stage === "preview" && (
        <div className="rounded border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">3. Review</h2>

          {errors.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-red">
                {errors.length} problem{errors.length === 1 ? "" : "s"} found — fix these in
                the sheet and re-upload. Nothing has been saved.
              </p>
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded bg-red/5 p-3 text-xs text-ink/80">
                {errors.map((e, i) => (
                  <li key={i}>
                    <span className="font-medium">
                      [{e.sheet}
                      {e.row ? ` row ${e.row}` : ""}
                      {e.field ? `, ${e.field}` : ""}]
                    </span>{" "}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            counts && (
              <div>
                <p className="mb-3 text-sm text-ink/70">
                  Looks good. This will create/update:
                </p>
                <ul className="mb-4 space-y-1 text-sm text-ink">
                  <li>{counts.buildings} building(s)</li>
                  <li>{counts.flats} flat(s)</li>
                  <li>{counts.tenants} new tenant(s)</li>
                  <li>{counts.bills} historical bill(s) — will be rejected if any already exist for that flat/month</li>
                </ul>
                <button
                  onClick={handleSubmit}
                  className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
                >
                  Confirm import
                </button>
              </div>
            )
          )}
        </div>
      )}

      {stage === "submitting" && (
        <div className="rounded border border-line bg-surface p-5 text-sm text-ink/60">
          Importing…
        </div>
      )}

      {stage === "done" && result && (
        <div className="rounded border border-line bg-surface p-5">
          {result.ok ? (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Done.</p>
              {result.counts && (
                <ul className="space-y-1 text-sm text-ink/70">
                  <li>{result.counts.buildings_created} building(s) created</li>
                  <li>{result.counts.flats_created} flat(s) created</li>
                  <li>{result.counts.tenants_created} tenant(s) created</li>
                  <li>{result.counts.bills_created} bill(s) created</li>
                </ul>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-medium text-red">
                Import failed — nothing was saved.
              </p>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-red/5 p-3 text-xs text-ink/80">
                {result.message}
              </pre>
            </div>
          )}
          <button
            onClick={reset}
            className="mt-4 rounded border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper"
          >
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
