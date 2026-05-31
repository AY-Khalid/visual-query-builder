"use client";

import { useCallback, useMemo, useState } from "react";
import { getDataSource } from "@/lib/datasources";
import { executeQuery, type ExecuteResult } from "@/lib/execute";
import { generateSql } from "@/lib/sql";
import { validateTree } from "@/lib/validation";
import { useQueryStore } from "@/store/queryStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GroupNode } from "./GroupNode";
import { ResultsTable } from "./ResultsTable";
import { SqlPreview } from "./SqlPreview";
import { ThemeToggle } from "./ThemeToggle";
import { Toolbar } from "./Toolbar";

export function QueryBuilder() {
  const sourceId = useQueryStore((s) => s.sourceId);
  const root = useQueryStore((s) => s.root);

  const source = getDataSource(sourceId)!;

  // Derived state (memoized) — recomputed only when tree/source change.
  const issues = useMemo(() => validateTree(root, source), [root, source]);
  const issueMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of issues) if (!m.has(i.nodeId)) m.set(i.nodeId, i.message);
    return m;
  }, [issues]);
  const sql = useMemo(() => generateSql(root, source), [root, source]);
  const valid = issues.length === 0;

  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const run = useCallback(() => {
    if (!valid) return;
    setLoading(true);
    // Simulate async execution latency.
    setTimeout(() => {
      setResult(executeQuery(root, source, { sortBy, sortDir }));
      setLoading(false);
    }, 250);
  }, [valid, root, source, sortBy, sortDir]);

  useKeyboardShortcuts(run);

  const handleSort = useCallback(
    (field: string) => {
      const dir = sortBy === field && sortDir === "asc" ? "desc" : "asc";
      setSortBy(field);
      setSortDir(dir);
      if (result) setResult(executeQuery(root, source, { sortBy: field, sortDir: dir }));
    },
    [sortBy, sortDir, result, root, source]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Visual Query Builder</h1>
          <p className="text-sm text-slate-500">
            Compose deeply nested queries visually — no raw syntax required.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Toolbar onRun={run} canRun={valid} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Query canvas" className="space-y-3">
          <GroupNode group={root} source={source} issues={issueMap} isRoot />
        </section>

        <section className="space-y-4">
          <SqlPreview sql={sql} valid={valid} />
          {!valid && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              <p className="font-semibold">{issues.length} validation issue(s):</p>
              <ul className="ml-4 list-disc">
                {issues.slice(0, 6).map((i, idx) => (
                  <li key={idx}>{i.message}</li>
                ))}
              </ul>
            </div>
          )}
          {result && (
            <ResultsTable
              source={source}
              rows={result.rows}
              total={result.total}
              loading={loading}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
            />
          )}
        </section>
      </div>
    </div>
  );
}
