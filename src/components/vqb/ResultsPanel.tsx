"use client";

import { useMemo, useState } from "react";
import { Table } from "lucide-react";
import type { ProjectedResult } from "@/lib/joinExecute";

const PAGE = 12;

export function ResultsPanel({ result, loading }: { result: ProjectedResult | null; loading: boolean }) {
  const [page, setPage] = useState(0);
  const rows = result?.rows ?? [];
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(() => rows.slice(safePage * PAGE, safePage * PAGE + PAGE), [rows, safePage]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 dark:border-slate-800">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Table size={14} /> Results
        </span>
        <span className="text-[11px] text-slate-500">
          {loading ? "Running…" : result ? `${result.total} row(s)` : "Run a query to see results"}
        </span>
      </div>

      <div className="thin-scroll flex-1 overflow-auto">
        {loading ? (
          <div className="space-y-1.5 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : !result ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No results yet.</div>
        ) : result.total === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Query returned no rows.</div>
        ) : (
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="sticky top-0 bg-slate-100 text-[11px] uppercase text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="border-b border-slate-200 px-2 py-1 dark:border-slate-700">#</th>
                {result.columns.map((c) => (
                  <th key={c.key} className="whitespace-nowrap border-b border-slate-200 px-3 py-1 font-semibold dark:border-slate-700">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr key={i} className="odd:bg-white even:bg-slate-50 hover:bg-sky-50 dark:odd:bg-slate-900 dark:even:bg-slate-900/50 dark:hover:bg-slate-800">
                  <td className="px-2 py-1 text-slate-400">{safePage * PAGE + i + 1}</td>
                  {result.columns.map((c) => (
                    <td key={c.key} className="whitespace-nowrap px-3 py-1">
                      {String(row[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {result && result.total > PAGE && (
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-1 text-[11px] dark:border-slate-800">
          <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-40 dark:border-slate-600">
            Prev
          </button>
          <span className="text-slate-500">Page {safePage + 1} / {pageCount}</span>
          <button disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-40 dark:border-slate-600">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
