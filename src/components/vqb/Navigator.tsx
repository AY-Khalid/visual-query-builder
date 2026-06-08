"use client";

import { useRef, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Database,
  Hash,
  List,
  Plus,
  Table2,
  ToggleLeft,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import type { FieldType } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useWorkspaceStore } from "@/store/workspaceStore";

function TypeIcon({ type }: { type: FieldType }) {
  const size = 13;
  const cls = "text-slate-400";
  if (type === "number") return <Hash size={size} className={cls} />;
  if (type === "date") return <Calendar size={size} className={cls} />;
  if (type === "boolean") return <ToggleLeft size={size} className={cls} />;
  if (type === "enum") return <List size={size} className={cls} />;
  return <Type size={size} className={cls} />;
}

export function Navigator() {
  const sources = useWorkspaceStore((s) => s.sources);
  const addTable = useWorkspaceStore((s) => s.addTable);
  const importCsv = useWorkspaceStore((s) => s.importCsv);
  const removeSource = useWorkspaceStore((s) => s.removeSource);

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  async function onFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      importCsv(text, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import CSV.");
    }
  }

  return (
    <aside className="flex max-h-[45vh] w-full shrink-0 flex-col border-b border-slate-200 bg-slate-50 md:h-full md:max-h-none md:w-64 md:border-b-0 md:border-r dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800">
        <Database size={14} /> Database Navigator
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto p-1.5 text-sm">
        {sources.map((src) => {
          const isImported = !["users", "products"].includes(src.id);
          const isOpen = open[src.id];
          return (
            <div key={src.id} className="mb-0.5">
              <div className="group flex items-center gap-1 rounded px-1 py-1 hover:bg-slate-200/60 dark:hover:bg-slate-800">
                <button onClick={() => toggle(src.id)} className="flex flex-1 items-center gap-1 text-left" aria-label={`Toggle ${src.name}`}>
                  {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                  <Table2 size={14} className="text-sky-600" />
                  <span className="truncate font-medium">{src.name}</span>
                  <span className="text-[10px] text-slate-400">({src.rows.length})</span>
                </button>
                <button
                  onClick={() => addTable(src.id)}
                  title="Add table to canvas"
                  className="rounded p-0.5 text-slate-400 opacity-0 hover:bg-sky-100 hover:text-sky-600 group-hover:opacity-100 dark:hover:bg-sky-950"
                >
                  <Plus size={14} />
                </button>
                {isImported && (
                  <button
                    onClick={() => removeSource(src.id)}
                    title="Remove imported table"
                    className="rounded p-0.5 text-slate-400 opacity-0 hover:text-rose-600 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {isOpen && (
                <ul className="ml-5 border-l border-slate-200 pl-2 dark:border-slate-700">
                  {src.fields.map((f) => (
                    <li key={f.name} className="flex items-center gap-1.5 rounded px-1 py-0.5 text-[13px] text-slate-600 dark:text-slate-300">
                      <TypeIcon type={f.type} />
                      <span className="truncate">{f.name}</span>
                      <span className="ml-auto text-[10px] text-slate-400">{f.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-200 p-2 dark:border-slate-800">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-slate-300 py-1.5 text-xs font-medium text-slate-600 hover:border-sky-400 hover:text-sky-600 dark:border-slate-600 dark:text-slate-300"
        >
          <Upload size={14} /> Import CSV as table
        </button>
        {error && <p className="mt-1 text-[11px] text-rose-500">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </aside>
  );
}
