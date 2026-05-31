"use client";

import { getOperator } from "@/lib/operators";
import type { OperatorId, SchemaField } from "@/lib/types";

const inputCls =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900";

interface Props {
  field: SchemaField | undefined;
  operator: OperatorId | null;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Renders the correct value control(s) for the field type + operator. */
export function ValueInput({ field, operator, value, onChange }: Props) {
  if (!field || !operator) return null;
  const op = getOperator(operator);
  if (!op || op.arity === 0) return null;

  const htmlType = field.type === "number" ? "number" : field.type === "date" ? "date" : "text";

  // BETWEEN: two bounds
  if (op.arity === 2) {
    const arr = Array.isArray(value) ? value : ["", ""];
    return (
      <div className="flex items-center gap-1.5">
        <input
          aria-label="Lower bound"
          type={htmlType}
          className={inputCls + " w-28"}
          value={(arr[0] as string) ?? ""}
          onChange={(e) => onChange([e.target.value, arr[1] ?? ""])}
        />
        <span className="text-xs text-slate-500">and</span>
        <input
          aria-label="Upper bound"
          type={htmlType}
          className={inputCls + " w-28"}
          value={(arr[1] as string) ?? ""}
          onChange={(e) => onChange([arr[0] ?? "", e.target.value])}
        />
      </div>
    );
  }

  // IN list
  if (operator === "in") {
    const display = Array.isArray(value) ? value.join(", ") : String(value ?? "");
    return (
      <input
        aria-label="Comma separated values"
        type="text"
        placeholder="a, b, c"
        className={inputCls + " w-56"}
        value={display}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
      />
    );
  }

  // enum dropdown
  if (field.type === "enum" && field.options) {
    return (
      <select
        aria-label="Value"
        className={inputCls + " w-44"}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  // boolean
  if (field.type === "boolean") {
    return (
      <select
        aria-label="Value"
        className={inputCls + " w-32"}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  return (
    <input
      aria-label="Value"
      type={htmlType}
      placeholder="value"
      className={inputCls + " w-44"}
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
