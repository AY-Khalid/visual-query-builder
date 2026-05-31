import { getOperator } from "./operators";
import type { DataSource, QueryGroup, QueryNode, QueryRule, SchemaField } from "./types";
import { isGroup } from "./types";

/** Escape a single-quoted SQL string literal (defensive, mock engine). */
function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function fieldType(source: DataSource, name: string | null): SchemaField["type"] | undefined {
  return source.fields.find((f) => f.name === name)?.type;
}

/** Render a scalar value as a SQL literal based on field type. */
function literal(value: unknown, type: SchemaField["type"] | undefined): string {
  if (value === null || value === undefined || value === "") return "NULL";
  if (type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : "NULL";
  }
  if (type === "boolean") {
    return value === true || value === "true" ? "TRUE" : "FALSE";
  }
  // string, enum, date -> quoted
  return quote(String(value));
}

/** Build the SQL fragment for one rule. Returns null if the rule is incomplete. */
export function ruleToSql(rule: QueryRule, source: DataSource): string | null {
  if (!rule.field || !rule.operator) return null;
  const op = getOperator(rule.operator);
  if (!op) return null;
  const type = fieldType(source, rule.field);
  const col = rule.field;

  switch (rule.operator) {
    case "isNull":
      return `${col} IS NULL`;
    case "isNotNull":
      return `${col} IS NOT NULL`;
    case "contains":
      return `${col} LIKE ${quote(`%${String(rule.value ?? "")}%`)}`;
    case "startsWith":
      return `${col} LIKE ${quote(`${String(rule.value ?? "")}%`)}`;
    case "endsWith":
      return `${col} LIKE ${quote(`%${String(rule.value ?? "")}`)}`;
    case "regex":
      return `${col} REGEXP ${quote(String(rule.value ?? ""))}`;
    case "in": {
      const arr = Array.isArray(rule.value)
        ? rule.value
        : String(rule.value ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      if (arr.length === 0) return null;
      return `${col} IN (${arr.map((v) => literal(v, type)).join(", ")})`;
    }
    case "between": {
      const arr = Array.isArray(rule.value) ? rule.value : [];
      const [a, b] = arr;
      if (a === undefined || a === "" || b === undefined || b === "") return null;
      return `${col} BETWEEN ${literal(a, type)} AND ${literal(b, type)}`;
    }
    default:
      return `${col} ${op.sql} ${literal(rule.value, type)}`;
  }
}

/** Recursively render a node's WHERE fragment. */
function nodeToSql(node: QueryNode, source: DataSource): string | null {
  if (isGroup(node)) {
    const parts = node.children
      .map((c) => nodeToSql(c, source))
      .filter((p): p is string => p !== null);
    if (parts.length === 0) return null;
    const joined = parts.join(` ${node.combinator} `);
    const wrapped = parts.length > 1 ? `(${joined})` : joined;
    return node.not ? `NOT ${parts.length > 1 ? wrapped : `(${joined})`}` : wrapped;
  }
  return ruleToSql(node, source);
}

/** Build a complete SELECT statement from the query tree. */
export function generateSql(root: QueryGroup, source: DataSource): string {
  const where = nodeToSql(root, source);
  const base = `SELECT *\nFROM ${source.id}`;
  if (!where) return `${base};`;
  // Strip a single outermost wrapping paren pair for readability.
  const clean = where.startsWith("(") && where.endsWith(")") ? where.slice(1, -1) : where;
  return `${base}\nWHERE ${clean};`;
}
