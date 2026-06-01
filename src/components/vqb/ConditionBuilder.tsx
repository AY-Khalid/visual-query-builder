"use client";

import { memo } from "react";
import { ChevronDown, ChevronRight, FolderPlus, Plus, X } from "lucide-react";
import { operatorsForType } from "@/lib/operators";
import type { CatalogField, Combinator, OperatorId, QueryGroup, QueryNode, SchemaField } from "@/lib/types";
import { isGroup } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { ValueInput } from "@/components/ValueInput";

const ctrl =
  "rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-sky-500 dark:border-slate-600 dark:bg-slate-800";

function fieldToSchema(cf: CatalogField | undefined): SchemaField | undefined {
  if (!cf) return undefined;
  return { name: cf.key, label: cf.label, type: cf.type, options: cf.options };
}

function ConditionRule({ rule, catalog, error }: { rule: Extract<QueryNode, { type: "rule" }>; catalog: CatalogField[]; error?: string }) {
  const setField = useWorkspaceStore((s) => s.setField);
  const setOperator = useWorkspaceStore((s) => s.setOperator);
  const setValue = useWorkspaceStore((s) => s.setValue);
  const removeNodeById = useWorkspaceStore((s) => s.removeNodeById);

  const cf = catalog.find((c) => c.key === rule.field);
  const schema = fieldToSchema(cf);
  const ops = cf ? operatorsForType(cf.type) : [];

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
      <select className={cn(ctrl, "w-44")} value={rule.field ?? ""} onChange={(e) => setField(rule.id, e.target.value)} aria-label="Condition field">
        <option value="">column…</option>
        {catalog.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
      <select className={cn(ctrl, "w-36")} value={rule.operator ?? ""} onChange={(e) => setOperator(rule.id, e.target.value as OperatorId)} disabled={!cf} aria-label="Condition operator">
        <option value="">operator…</option>
        {ops.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ValueInput field={schema} operator={rule.operator} value={rule.value} onChange={(v) => setValue(rule.id, v)} />
      {error && <span className="text-[11px] text-rose-500">{error}</span>}
      <button type="button" onClick={() => removeNodeById(rule.id)} className="ml-auto rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950" aria-label="Remove condition">
        <X size={14} />
      </button>
    </div>
  );
}

interface GroupProps {
  group: QueryGroup;
  catalog: CatalogField[];
  issues: Map<string, string>;
  isRoot?: boolean;
}

function ConditionGroupBase({ group, catalog, issues, isRoot = false }: GroupProps) {
  const addRule = useWorkspaceStore((s) => s.addRule);
  const addGroup = useWorkspaceStore((s) => s.addGroup);
  const removeNodeById = useWorkspaceStore((s) => s.removeNodeById);
  const setCombinator = useWorkspaceStore((s) => s.setCombinator);
  const toggleNot = useWorkspaceStore((s) => s.toggleNot);
  const toggleCollapsed = useWorkspaceStore((s) => s.toggleCollapsed);

  return (
    <div
      className={cn(
        "rounded-md border-l-2 pl-2",
        group.combinator === "AND" ? "border-l-sky-500" : "border-l-amber-500",
        isRoot ? "border-y border-r border-slate-200 bg-slate-50/60 p-2 dark:border-slate-700 dark:bg-slate-900/40" : "border-y border-r border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/70"
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <button type="button" onClick={() => toggleCollapsed(group.id)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={group.collapsed ? "Expand group" : "Collapse group"}>
          {group.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
        </button>
        <div className="inline-flex overflow-hidden rounded border border-slate-300 text-[11px] font-semibold dark:border-slate-600">
          {(["AND", "OR"] as Combinator[]).map((c) => (
            <button key={c} type="button" onClick={() => setCombinator(group.id, c)} className={cn("px-2 py-0.5", group.combinator === c ? (c === "AND" ? "bg-sky-600 text-white" : "bg-amber-500 text-white") : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
              {c}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => toggleNot(group.id)} className={cn("rounded border px-1.5 py-0.5 text-[11px] font-semibold", group.not ? "border-rose-500 bg-rose-500 text-white" : "border-slate-300 text-slate-500 dark:border-slate-600")}>
          NOT
        </button>
        <span className="text-[11px] text-slate-400">{group.children.length}</span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => addRule(group.id)} className="inline-flex items-center gap-1 rounded bg-sky-600 px-1.5 py-0.5 text-[11px] font-medium text-white hover:bg-sky-700">
            <Plus size={12} /> Condition
          </button>
          <button type="button" onClick={() => addGroup(group.id)} className="inline-flex items-center gap-1 rounded border border-sky-600 px-1.5 py-0.5 text-[11px] font-medium text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950">
            <FolderPlus size={12} /> Group
          </button>
          {!isRoot && (
            <button type="button" onClick={() => removeNodeById(group.id)} className="rounded p-0.5 text-slate-400 hover:text-rose-600" aria-label="Remove group">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {issues.get(group.id) && <p className="mb-1 text-[11px] text-rose-500">{issues.get(group.id)}</p>}

      {!group.collapsed && (
        <div className="space-y-1.5">
          {group.children.length === 0 && (
            <p className="rounded border border-dashed border-slate-300 p-2 text-center text-[11px] text-slate-400 dark:border-slate-700">Empty group</p>
          )}
          {group.children.map((child) =>
            isGroup(child) ? (
              <ConditionGroup key={child.id} group={child} catalog={catalog} issues={issues} />
            ) : (
              <ConditionRule key={child.id} rule={child} catalog={catalog} error={issues.get(child.id)} />
            )
          )}
        </div>
      )}
    </div>
  );
}

export const ConditionGroup = memo(ConditionGroupBase);
