import type { DataSource, QueryGroup, QueryNode, QueryRule, SchemaField } from "./types";
import { isGroup } from "./types";

type Row = Record<string, unknown>;

function coerce(value: unknown, type: SchemaField["type"] | undefined): unknown {
  if (value === null || value === undefined) return value;
  if (type === "number") return Number(value);
  if (type === "boolean") return value === true || value === "true";
  if (type === "date") return String(value);
  return String(value);
}

function evalRule(rule: QueryRule, row: Row, source: DataSource): boolean {
  if (!rule.field || !rule.operator) return true; // incomplete rules are no-ops
  const field = source.fields.find((f) => f.name === rule.field);
  const type = field?.type;
  const raw = row[rule.field];

  switch (rule.operator) {
    case "isNull":
      return raw === null || raw === undefined || raw === "";
    case "isNotNull":
      return !(raw === null || raw === undefined || raw === "");
  }

  if (raw === null || raw === undefined) return false;

  const cell = coerce(raw, type);
  const target = rule.operator === "between" || rule.operator === "in" ? rule.value : coerce(rule.value, type);

  switch (rule.operator) {
    case "eq":
      return cell === target;
    case "neq":
      return cell !== target;
    case "gt":
      return (cell as number) > (target as number);
    case "gte":
      return (cell as number) >= (target as number);
    case "lt":
      return (cell as number) < (target as number);
    case "lte":
      return (cell as number) <= (target as number);
    case "contains":
      return String(cell).toLowerCase().includes(String(rule.value).toLowerCase());
    case "startsWith":
      return String(cell).toLowerCase().startsWith(String(rule.value).toLowerCase());
    case "endsWith":
      return String(cell).toLowerCase().endsWith(String(rule.value).toLowerCase());
    case "regex":
      try {
        return new RegExp(String(rule.value)).test(String(cell));
      } catch {
        return false;
      }
    case "in": {
      const arr = Array.isArray(rule.value)
        ? rule.value
        : String(rule.value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      return arr.map((v) => coerce(v, type)).some((v) => v === cell);
    }
    case "between": {
      const arr = Array.isArray(rule.value) ? rule.value : [];
      const [a, b] = arr.map((v) => coerce(v, type));
      return (cell as number) >= (a as number) && (cell as number) <= (b as number);
    }
    default:
      return false;
  }
}

function evalNode(node: QueryNode, row: Row, source: DataSource): boolean {
  if (isGroup(node)) {
    if (node.children.length === 0) return true;
    const results = node.children.map((c) => evalNode(c, row, source));
    const combined = node.combinator === "AND" ? results.every(Boolean) : results.some(Boolean);
    return node.not ? !combined : combined;
  }
  return evalRule(node, row, source);
}

export interface ExecuteOptions {
  sortBy?: string | null;
  sortDir?: "asc" | "desc";
}

export interface ExecuteResult {
  rows: Row[];
  total: number;
}

/** Run the query tree against the source's mock dataset. */
export function executeQuery(root: QueryGroup, source: DataSource, opts: ExecuteOptions = {}): ExecuteResult {
  let rows = source.rows.filter((row) => evalNode(root, row, source));

  if (opts.sortBy) {
    const key = opts.sortBy;
    const dir = opts.sortDir === "desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return (av < bv ? -1 : 1) * dir;
    });
  }

  return { rows, total: rows.length };
}
