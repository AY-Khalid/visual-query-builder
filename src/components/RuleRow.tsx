"use client";

import { memo } from "react";
import { operatorsForType } from "@/lib/operators";
import type { DataSource, OperatorId, QueryRule } from "@/lib/types";
import { useQueryStore } from "@/store/queryStore";
import { ValueInput } from "./ValueInput";

const selectCls =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900";

interface Props {
  rule: QueryRule;
  source: DataSource;
  error?: string;
  dragHandle?: React.ReactNode;
}

function RuleRowBase({ rule, source, error, dragHandle }: Props) {
  const setField = useQueryStore((s) => s.setField);
  const setOperator = useQueryStore((s) => s.setOperator);
  const setValue = useQueryStore((s) => s.setValue);
  const removeNodeById = useQueryStore((s) => s.removeNodeById);

  const field = source.fields.find((f) => f.name === rule.field);
  const ops = field ? operatorsForType(field.type) : [];

  return (
    <div className="animate-fade-in rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        {dragHandle}

        <select
          aria-label="Field"
          className={selectCls + " w-40"}
          value={rule.field ?? ""}
          onChange={(e) => setField(rule.id, e.target.value)}
        >
          <option value="">Field…</option>
          {source.fields.map((f) => (
            <option key={f.name} value={f.name}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Operator"
          className={selectCls + " w-44"}
          value={rule.operator ?? ""}
          onChange={(e) => setOperator(rule.id, e.target.value as OperatorId)}
          disabled={!field}
        >
          <option value="">Operator…</option>
          {ops.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>

        <ValueInput
          field={field}
          operator={rule.operator}
          value={rule.value}
          onChange={(v) => setValue(rule.id, v)}
        />

        <button
          type="button"
          aria-label="Remove condition"
          onClick={() => removeNodeById(rule.id)}
          className="ml-auto rounded-md px-2 py-1 text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950"
        >
          ✕
        </button>
      </div>

      {error && <p className="mt-1.5 pl-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export const RuleRow = memo(RuleRowBase);
