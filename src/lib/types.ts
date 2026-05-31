// Core typed query models for the Visual Query Builder.

/** Supported logical combinators for a group of conditions. */
export type Combinator = "AND" | "OR";

/** Field data types supported by the schema-driven system. */
export type FieldType = "string" | "number" | "boolean" | "enum" | "date";

/** All operators the engine understands. */
export type OperatorId =
  | "eq"
  | "neq"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "between"
  | "regex"
  | "isNull"
  | "isNotNull";

/** A single schema field definition. */
export interface SchemaField {
  /** Machine key, e.g. "age". */
  name: string;
  /** Human label, e.g. "Age". */
  label: string;
  type: FieldType;
  /** Allowed values for enum fields. */
  options?: string[];
}

/** A named data source: a schema plus a mock dataset. */
export interface DataSource {
  id: string;
  name: string;
  fields: SchemaField[];
  rows: Record<string, unknown>[];
}

/** A leaf rule: field operator value. */
export interface QueryRule {
  id: string;
  type: "rule";
  field: string | null;
  operator: OperatorId | null;
  /** For "between" this is a [min, max] tuple; for "in" an array; otherwise scalar. */
  value: unknown;
}

/** A group node containing children combined by a combinator. */
export interface QueryGroup {
  id: string;
  type: "group";
  combinator: Combinator;
  /** Inverts the whole group (NOT). */
  not?: boolean;
  children: QueryNode[];
  /** UI-only: collapsed state. */
  collapsed?: boolean;
}

export type QueryNode = QueryRule | QueryGroup;

/** A saved/named query snapshot. */
export interface SavedQuery {
  id: string;
  name: string;
  sourceId: string;
  root: QueryGroup;
  createdAt: number;
}

/** A single validation problem tied to a node. */
export interface ValidationIssue {
  nodeId: string;
  message: string;
}

/** Exported/imported document shape. */
export interface QueryDocument {
  version: 1;
  sourceId: string;
  root: QueryGroup;
}

export function isGroup(node: QueryNode): node is QueryGroup {
  return node.type === "group";
}

export function isRule(node: QueryNode): node is QueryRule {
  return node.type === "rule";
}
