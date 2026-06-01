"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildCatalog,
  buildJoinedRows,
  generateJoinSql,
  resolveTables,
} from "@/lib/joins";
import { buildCatalogSource, executeJoinQuery, type ProjectedResult } from "@/lib/joinExecute";
import { validateTree } from "@/lib/validation";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { Navigator } from "./Navigator";
import { Canvas } from "./Canvas";
import { QueryPanel } from "./QueryPanel";
import { ResultsPanel } from "./ResultsPanel";
import { SqlEditor } from "./SqlEditor";
import { Toolbar } from "./Toolbar";

export function AppShell() {
  const sources = useWorkspaceStore((s) => s.sources);
  const tables = useWorkspaceStore((s) => s.tables);
  const joins = useWorkspaceStore((s) => s.joins);
  const columns = useWorkspaceStore((s) => s.columns);
  const sorts = useWorkspaceStore((s) => s.sorts);
  const conditionRoot = useWorkspaceStore((s) => s.conditionRoot);

  const resolved = useMemo(() => resolveTables(tables, sources), [tables, sources]);
  const catalog = useMemo(() => buildCatalog(resolved), [resolved]);
  const joinedRows = useMemo(() => buildJoinedRows(resolved, joins), [resolved, joins]);
  const catalogSource = useMemo(() => buildCatalogSource(catalog, joinedRows), [catalog, joinedRows]);

  const issues = useMemo(() => validateTree(conditionRoot, catalogSource), [conditionRoot, catalogSource]);
  const issueMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of issues) if (!m.has(i.nodeId)) m.set(i.nodeId, i.message);
    return m;
  }, [issues]);

  const sql = useMemo(
    () => generateJoinSql(resolved, joins, columns, conditionRoot, catalogSource, sorts),
    [resolved, joins, columns, conditionRoot, catalogSource, sorts]
  );

  const valid = resolved.length > 0 && issues.length === 0;

  const [result, setResult] = useState<ProjectedResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(() => {
    if (!valid) return;
    setLoading(true);
    setTimeout(() => {
      setResult(executeJoinQuery(resolved, catalog, joinedRows, columns, conditionRoot, sorts));
      setLoading(false);
    }, 220);
  }, [valid, resolved, catalog, joinedRows, columns, conditionRoot, sorts]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  return (
    <div className="flex h-screen flex-col overflow-hidden text-slate-900 dark:text-slate-100">
      <Toolbar onRun={run} canRun={valid} />

      <div className="flex min-h-0 flex-1">
        <Navigator />

        {/* center column: canvas (top) + query panel (bottom) */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 border-b border-slate-200 dark:border-slate-800">
            <Canvas tables={resolved} joins={joins} />
          </div>
          <div className="h-72 shrink-0 border-b border-slate-200 dark:border-slate-800">
            <QueryPanel tables={resolved} catalog={catalog} conditionRoot={conditionRoot} issues={issueMap} />
          </div>
        </div>

        {/* right column: SQL editor (top) + results (bottom) */}
        <div className="flex w-[28rem] shrink-0 flex-col">
          <div className="min-h-0 flex-1">
            <SqlEditor sql={sql} />
          </div>
          <div className="h-72 shrink-0 border-t border-slate-200 dark:border-slate-800">
            <ResultsPanel result={result} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
