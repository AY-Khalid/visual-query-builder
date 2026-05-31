"use client";

import { useRef, useState } from "react";
import { DATA_SOURCES } from "@/lib/datasources";
import { exportQuery, importQuery } from "@/lib/serialize";
import { useQueryStore } from "@/store/queryStore";

const btn =
  "rounded-md border border-slate-300 px-2.5 py-1.5 text-sm transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800";

export function Toolbar({ onRun, canRun }: { onRun: () => void; canRun: boolean }) {
  const sourceId = useQueryStore((s) => s.sourceId);
  const root = useQueryStore((s) => s.root);
  const saved = useQueryStore((s) => s.saved);
  const setSource = useQueryStore((s) => s.setSource);
  const undo = useQueryStore((s) => s.undo);
  const redo = useQueryStore((s) => s.redo);
  const reset = useQueryStore((s) => s.reset);
  const replaceTree = useQueryStore((s) => s.replaceTree);
  const savePreset = useQueryStore((s) => s.savePreset);
  const loadPreset = useQueryStore((s) => s.loadPreset);
  const deletePreset = useQueryStore((s) => s.deletePreset);
  const canUndo = useQueryStore((s) => s.past.length > 0);
  const canRedo = useQueryStore((s) => s.future.length > 0);

  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    const json = exportQuery(sourceId, root);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const { sourceId: sid, root: imported } = importQuery(text);
      replaceTree(imported, sid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    }
  }

  function handleSave() {
    const name = window.prompt("Preset name:");
    if (name) savePreset(name);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Data source"
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          value={sourceId}
          onChange={(e) => setSource(e.target.value)}
        >
          {DATA_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button type="button" className={btn} onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button type="button" className={btn} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          ↷ Redo
        </button>
        <button type="button" className={btn} onClick={reset}>
          Reset
        </button>

        <button type="button" className={btn} onClick={handleSave}>
          Save preset
        </button>
        <button type="button" className={btn} onClick={handleExport}>
          Export JSON
        </button>
        <button type="button" className={btn} onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          title="Run (Ctrl+Enter)"
          className="ml-auto rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
        >
          ▶ Run query
        </button>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {saved.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Presets:</span>
          {saved.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-xs dark:border-slate-700"
            >
              <button type="button" className="hover:text-indigo-600" onClick={() => loadPreset(p.id)}>
                {p.name}
              </button>
              <button
                type="button"
                aria-label={`Delete preset ${p.name}`}
                className="text-rose-500"
                onClick={() => deletePreset(p.id)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
