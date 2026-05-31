import type { Combinator, OperatorId, QueryDocument, QueryGroup, QueryNode } from "./types";
import { createGroup } from "./tree";

const MAX_DEPTH = 64;
const VALID_COMBINATORS: Combinator[] = ["AND", "OR"];

/**
 * Recursively validate and rebuild an untrusted node into a safe QueryNode.
 * Throws on malformed structures. Caps nesting depth to prevent stack abuse.
 */
function sanitizeNode(input: unknown, depth: number): QueryNode {
  if (depth > MAX_DEPTH) throw new Error("Query nesting too deep.");
  if (!input || typeof input !== "object") throw new Error("Invalid node.");
  const node = input as Record<string, unknown>;

  if (node.type === "group") {
    const combinator = VALID_COMBINATORS.includes(node.combinator as Combinator)
      ? (node.combinator as Combinator)
      : "AND";
    if (!Array.isArray(node.children)) throw new Error("Group children must be an array.");
    return {
      id: typeof node.id === "string" ? node.id : `grp_${Math.random().toString(36).slice(2)}`,
      type: "group",
      combinator,
      not: Boolean(node.not),
      collapsed: Boolean(node.collapsed),
      children: node.children.map((c) => sanitizeNode(c, depth + 1)),
    };
  }

  if (node.type === "rule") {
    return {
      id: typeof node.id === "string" ? node.id : `rule_${Math.random().toString(36).slice(2)}`,
      type: "rule",
      field: typeof node.field === "string" ? node.field : null,
      operator: typeof node.operator === "string" ? (node.operator as OperatorId) : null,
      value: sanitizeValue(node.value),
    };
  }

  throw new Error('Node "type" must be "group" or "rule".');
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => sanitizeScalar(v));
  return sanitizeScalar(value);
}

function sanitizeScalar(value: unknown): unknown {
  if (typeof value === "string") return value.slice(0, 1000);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  return ""; // drop objects/functions
}

export function exportQuery(sourceId: string, root: QueryGroup): string {
  const doc: QueryDocument = { version: 1, sourceId, root };
  return JSON.stringify(doc, null, 2);
}

export interface ImportResult {
  sourceId: string;
  root: QueryGroup;
}

/** Parse and sanitize an imported JSON document. Throws with a clear message on failure. */
export function importQuery(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Document is empty or malformed.");
  const doc = parsed as Record<string, unknown>;
  const sourceId = typeof doc.sourceId === "string" ? doc.sourceId : "users";
  const safeRoot = sanitizeNode(doc.root ?? createGroup(), 0);
  if (safeRoot.type !== "group") throw new Error("Root must be a group.");
  return { sourceId, root: safeRoot };
}
