"use client";

import { useState } from "react";
import { ArrowDownUp, Columns3, Filter, GitMerge, Plus, X } from "lucide-react";
import type {
  Aggregate,
  CatalogField,
  JoinType,
  QueryGroup,
} from "@/lib/types";
import type { ResolvedTable } from "@/lib/joins";
import { cn } from "@/lib/cn";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { ConditionGroup } from "./ConditionBuilder";

const ctrl =
  "rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-sky-500 dark:border-slate-600 dark:bg-slate-800";

const AGGREGATES: Aggregate[] = ["NONE", "COUNT", "SUM", "AVG", "MIN", "MAX"];
const JOIN_TYPES: JoinType[] = ["INNER", "LEFT", "RIGHT", "FULL"];

function FieldSelect({
  tables,
  tableId,
  field,
  onChange,
}: {
  tables: ResolvedTable[];
  tableId: string;
  field: string;
  onChange: (tableId: string, field: string) => void;
}) {
  return (
    <select
      className={cn(ctrl, "w-48")}
      value={`${tableId}|${field}`}
      onChange={(e) => {
        const [tid, fl] = e.target.value.split("|");
        onChange(tid, fl);
      }}
      aria-label="Table column"
    >
      {tables.map((t) => (
        <optgroup key={t.id} label={`${t.source.name} (${t.alias})`}>
          {t.source.fields.map((f) => (
            <option key={f.name} value={`${t.id}|${f.name}`}>
              {t.alias}.{f.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/* ------------------------------- Columns -------------------------------- */
function ColumnsTab({ tables }: { tables: ResolvedTable[] }) {
  const columns = useWorkspaceStore((s) => s.columns);
  const addColumn = useWorkspaceStore((s) => s.addColumn);
  const updateColumn = useWorkspaceStore((s) => s.updateColumn);
  const removeColumn = useWorkspaceStore((s) => s.removeColumn);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">
          {columns.length === 0 ? "No columns selected — all columns (*) will be returned." : `${columns.length} column(s)`}
        </p>
        <button
          onClick={() => tables[0] && addColumn(tables[0].id, tables[0].source.fields[0].name)}
          disabled={tables.length === 0}
          className="inline-flex items-center gap-1 rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-40"
        >
          <Plus size={13} /> Add column
        </button>
      </div>
      {columns.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-1.5">
          <FieldSelect tables={tables} tableId={c.tableId} field={c.field} onChange={(tid, fl) => updateColumn(c.id, { tableId: tid, field: fl })} />
          <select className={cn(ctrl, "w-24")} value={c.aggregate} onChange={(e) => updateColumn(c.id, { aggregate: e.target.value as Aggregate })} aria-label="Aggregate">
            {AGGREGATES.map((a) => (
              <option key={a} value={a}>
                {a === "NONE" ? "—" : a}
              </option>
            ))}
          </select>
          <input className={cn(ctrl, "w-36")} placeholder="alias (optional)" value={c.alias ?? ""} onChange={(e) => updateColumn(c.id, { alias: e.target.value })} aria-label="Column alias" />
          <button onClick={() => removeColumn(c.id)} className="rounded p-1 text-slate-400 hover:text-rose-600" aria-label="Remove column">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- Joins --------------------------------- */
function JoinsTab({ tables }: { tables: ResolvedTable[] }) {
  const joins = useWorkspaceStore((s) => s.joins);
  const addJoin = useWorkspaceStore((s) => s.addJoin);
  const updateJoin = useWorkspaceStore((s) => s.updateJoin);
  const removeJoin = useWorkspaceStore((s) => s.removeJoin);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">{tables.length < 2 ? "Add at least two tables to define a join." : `${joins.length} join(s)`}</p>
        <button onClick={addJoin} disabled={tables.length < 2} className="inline-flex items-center gap-1 rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-40">
          <Plus size={13} /> Add join
        </button>
      </div>
      {joins.map((j) => (
        <div key={j.id} className="flex flex-wrap items-center gap-1.5">
          <select className={cn(ctrl, "w-24")} value={j.type} onChange={(e) => updateJoin(j.id, { type: e.target.value as JoinType })} aria-label="Join type">
            {JOIN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <FieldSelect tables={tables} tableId={j.leftTableId} field={j.leftField} onChange={(tid, fl) => updateJoin(j.id, { leftTableId: tid, leftField: fl })} />
          <span className="text-xs font-semibold text-slate-400">=</span>
          <FieldSelect tables={tables} tableId={j.rightTableId} field={j.rightField} onChange={(tid, fl) => updateJoin(j.id, { rightTableId: tid, rightField: fl })} />
          <button onClick={() => removeJoin(j.id)} className="rounded p-1 text-slate-400 hover:text-rose-600" aria-label="Remove join">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Sorting -------------------------------- */
function SortingTab({ tables }: { tables: ResolvedTable[] }) {
  const sorts = useWorkspaceStore((s) => s.sorts);
  const addSort = useWorkspaceStore((s) => s.addSort);
  const updateSort = useWorkspaceStore((s) => s.updateSort);
  const removeSort = useWorkspaceStore((s) => s.removeSort);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">{sorts.length} sort rule(s)</p>
        <button onClick={() => tables[0] && addSort(tables[0].id, tables[0].source.fields[0].name)} disabled={tables.length === 0} className="inline-flex items-center gap-1 rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-40">
          <Plus size={13} /> Add sort
        </button>
      </div>
      {sorts.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center gap-1.5">
          <FieldSelect tables={tables} tableId={s.tableId} field={s.field} onChange={(tid, fl) => updateSort(s.id, { tableId: tid, field: fl })} />
          <select className={cn(ctrl, "w-24")} value={s.dir} onChange={(e) => updateSort(s.id, { dir: e.target.value as "ASC" | "DESC" })} aria-label="Sort direction">
            <option value="ASC">ASC ▲</option>
            <option value="DESC">DESC ▼</option>
          </select>
          <button onClick={() => removeSort(s.id)} className="rounded p-1 text-slate-400 hover:text-rose-600" aria-label="Remove sort">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

type Tab = "columns" | "conditions" | "joins" | "sorting";

const TABS: { id: Tab; label: string; icon: typeof Columns3 }[] = [
  { id: "columns", label: "Columns", icon: Columns3 },
  { id: "conditions", label: "Conditions", icon: Filter },
  { id: "joins", label: "Joins", icon: GitMerge },
  { id: "sorting", label: "Sorting", icon: ArrowDownUp },
];

export function QueryPanel({
  tables,
  catalog,
  conditionRoot,
  issues,
}: {
  tables: ResolvedTable[];
  catalog: CatalogField[];
  conditionRoot: QueryGroup;
  issues: Map<string, string>;
}) {
  const [tab, setTab] = useState<Tab>("columns");
  const joinCount = useWorkspaceStore((s) => s.joins.length);

  return (
    <div className="flex h-full">
      <div className="flex w-36 shrink-0 flex-col border-r border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/50">
        {TABS.map((t) => {
          const Icon = t.icon;
          const badge = t.id === "joins" && joinCount > 0 ? joinCount : null;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 border-l-2 px-3 py-2 text-left text-sm",
                tab === t.id
                  ? "border-l-sky-600 bg-white font-semibold text-sky-700 dark:bg-slate-800 dark:text-sky-300"
                  : "border-l-transparent text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <Icon size={15} /> {t.label}
              {badge && <span className="ml-auto rounded-full bg-sky-600 px-1.5 text-[10px] text-white">{badge}</span>}
            </button>
          );
        })}
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto p-3">
        {tables.length === 0 ? (
          <p className="text-sm text-slate-400">Add tables to the canvas to configure the query.</p>
        ) : tab === "columns" ? (
          <ColumnsTab tables={tables} />
        ) : tab === "conditions" ? (
          <ConditionGroup group={conditionRoot} catalog={catalog} issues={issues} isRoot />
        ) : tab === "joins" ? (
          <JoinsTab tables={tables} />
        ) : (
          <SortingTab tables={tables} />
        )}
      </div>
    </div>
  );
}
