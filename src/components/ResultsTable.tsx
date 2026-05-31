"use client";

import { useMemo, useState } from "react";
import type { DataSource } from "@/lib/types";

const PAGE_SIZE = 10;

interface Props {
  source: DataSource;
  rows: Record<string, unknown>[];
  loading: boolean;
  total: number;
  sortBy: string | null;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}

export function ResultsTable({ source, rows, loading, total, sortBy, sortDir, onSort }: Props) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

  const pageRows = useMemo(
    () => rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [rows, safePage]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <span className="text-sm font-semibold">Results</span>
        <span className="text-xs text-slate-500" data-testid="result-count">
          {loading ? "Running…" : `${total} match${total === 1 ? "" : "es"}`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">
          No rows match this query. Try loosening your conditions.
        </div>
      ) : (
        <>
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50">
                <tr>
                  {source.fields.map((f) => (
                    <th
                      key={f.name}
                      onClick={() => onSort(f.name)}
                      className="cursor-pointer whitespace-nowrap px-3 py-2 font-semibold hover:text-indigo-600"
                    >
                      {f.label}
                      {sortBy === f.name ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                  >
                    {source.fields.map((f) => (
                      <td key={f.name} className="whitespace-nowrap px-3 py-1.5">
                        {String(row[f.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-3 py-2 text-xs">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40 dark:border-slate-700"
            >
              Prev
            </button>
            <span className="text-slate-500">
              Page {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40 dark:border-slate-700"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
