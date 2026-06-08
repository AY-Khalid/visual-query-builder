"use client";

import { useEffect, useState } from "react";
import { Boxes, Moon, Play, Redo2, RotateCcw, Sun, Undo2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";

function ThemeBtn() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const n = !dark;
    setDark(n);
    document.documentElement.classList.toggle("dark", n);
    try {
      localStorage.setItem("vqb-theme", n ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }
  return (
    <button onClick={toggle} className="rounded p-1.5 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-700" aria-label="Toggle theme">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function Toolbar({ onRun, canRun }: { onRun: () => void; canRun: boolean }) {
  const reset = useWorkspaceStore((s) => s.reset);
  const undo = useWorkspaceStore((s) => s.undo);
  const redo = useWorkspaceStore((s) => s.redo);
  const canUndo = useWorkspaceStore((s) => s.past.length > 0);
  const canRedo = useWorkspaceStore((s) => s.future.length > 0);
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded bg-sky-600 text-white">
          <Boxes size={17} />
        </span>
        <h1 className="text-base font-bold tracking-tight">
          V<span className="text-sky-600">Query</span>Builder
        </h1>
      </div>

      <span className="hidden items-center gap-1.5 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 sm:flex dark:border-slate-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> localhost · sample schema
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="rounded p-1.5 text-slate-500 hover:bg-slate-200/70 disabled:opacity-30 dark:hover:bg-slate-700"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="rounded p-1.5 text-slate-500 hover:bg-slate-200/70 disabled:opacity-30 dark:hover:bg-slate-700"
        >
          <Redo2 size={16} />
        </button>
        <button
          onClick={onRun}
          disabled={!canRun}
          title="Run query (Ctrl+Enter)"
          className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          <Play size={15} /> Run
        </button>
        <button onClick={reset} title="Clear canvas" className="inline-flex items-center gap-1.5 rounded border border-slate-300 px-2.5 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">
          <RotateCcw size={15} /> Reset
        </button>
        <ThemeBtn />
      </div>
    </header>
  );
}
