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
import { MobileGate } from "./MobileGate";
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

  const undo = useWorkspaceStore((s) => s.undo);
  const redo = useWorkspaceStore((s) => s.redo);

  const issues = useMemo(() => validateTree(conditionRoot, catalogSource), [conditionRoot, catalogSource]);
  const issueMap = useMemo(() => {
    const m = new Map<string, string>();
    // The root group may legitimately be empty ("no conditions"), so don't flag it.
    for (const i of issues) {
      if (i.nodeId === conditionRoot.id) continue;
      if (!m.has(i.nodeId)) m.set(i.nodeId, i.message);
    }
    return m;
  }, [issues, conditionRoot.id]);

  const sql = useMemo(
    () => generateJoinSql(resolved, joins, columns, conditionRoot, catalogSource, sorts),
    [resolved, joins, columns, conditionRoot, catalogSource, sorts]
  );

  // The query can run as long as there is at least one table — conditions are optional.
  const canRun = resolved.length > 0;

  const [result, setResult] = useState<ProjectedResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Clear the results table when the canvas (and therefore the SQL) is empty.
  useEffect(() => {
    if (resolved.length === 0) setResult(null);
  }, [resolved.length]);

  const run = useCallback(() => {
    if (!canRun) return;
    setLoading(true);
    setTimeout(() => {
      setResult(executeJoinQuery(resolved, catalog, joinedRows, columns, conditionRoot, sorts));
      setLoading(false);
    }, 220);
  }, [canRun, resolved, catalog, joinedRows, columns, conditionRoot, sorts]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "enter") {
        e.preventDefault();
        run();
      } else if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, undo, redo]);

  return (
    <div className="flex min-h-screen flex-col text-slate-900 md:h-screen md:overflow-hidden dark:text-slate-100">
      <MobileGate />
      <Toolbar onRun={run} canRun={canRun} />

      {/* Stacks vertically and scrolls on phones; side-by-side panes on md+ */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Navigator />

        {/* center column: canvas (top) + query panel (bottom) */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="h-[55vh] border-b border-slate-200 md:h-auto md:min-h-0 md:flex-1 dark:border-slate-800">
            <Canvas tables={resolved} joins={joins} />
          </div>
          <div className="h-[26rem] shrink-0 border-b border-slate-200 md:h-72 dark:border-slate-800">
            <QueryPanel tables={resolved} catalog={catalog} conditionRoot={conditionRoot} issues={issueMap} />
          </div>
        </div>

        {/* right column: SQL editor (top) + results (bottom) */}
        <div className="flex w-full shrink-0 flex-col md:w-[28rem]">
          <div className="h-[40vh] border-t border-slate-200 md:h-auto md:min-h-0 md:flex-1 md:border-t-0 dark:border-slate-800">
            <SqlEditor sql={sql} />
          </div>
          <div className="h-[26rem] shrink-0 border-t border-slate-200 md:h-72 dark:border-slate-800">
            <ResultsPanel result={result} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
