"use client";

import { useMemo, useState } from "react";

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
}

export default function DataTable<T extends { id: string }>({
  columns,
  rows,
  searchPlaceholder = "Search…",
  searchAccessor,
  rowHref,
  rowTone,
  emptyLabel = "Nothing here yet.",
}: {
  columns: Column<T>[];
  rows: T[];
  searchPlaceholder?: string;
  searchAccessor?: (row: T) => string;
  rowHref?: (row: T) => string;
  rowTone?: (row: T) => "default" | "amber" | "red" | "accent";
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    if (!query || !searchAccessor) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => searchAccessor(r).toLowerCase().includes(q));
  }, [rows, query, searchAccessor]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const toneBorder = {
    default: "border-l-transparent",
    amber: "border-l-amber",
    red: "border-l-red",
    accent: "border-l-accent",
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {searchAccessor && (
        <div className="border-b border-line px-3 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full max-w-xs rounded border border-line bg-paper px-3 py-1.5 text-sm placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
      )}

      <table className="w-full text-sm">
        <thead className="bg-paper text-left text-ink-muted">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-wide ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.sortValue ? (
                  <button
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-ink"
                  >
                    {col.header}
                    {sortKey === col.key && (
                      <span className="text-[10px]">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const tone = rowTone?.(row) ?? "default";
            const content = (
              <>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 ${
                      col.align === "right"
                        ? "text-right tabular-nums"
                        : "text-left"
                    }`}
                  >
                    {col.accessor(row)}
                  </td>
                ))}
              </>
            );
            const rowClass = `border-t border-line border-l-2 ${toneBorder[tone]}`;
            return rowHref ? (
              <tr
                key={row.id}
                className={`${rowClass} cursor-pointer hover:bg-paper/60`}
                onClick={() => {
                  window.location.href = rowHref(row);
                }}
              >
                {content}
              </tr>
            ) : (
              <tr key={row.id} className={rowClass}>
                {content}
              </tr>
            );
          })}
          {!sorted.length && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-ink-muted"
              >
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
