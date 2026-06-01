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

/* ------------------------------------------------------------------ *
 * Visual workspace models (DBeaver-style canvas, joins, projection)  *
 * ------------------------------------------------------------------ */

export type JoinType = "INNER" | "LEFT" | "RIGHT" | "FULL";

export type Aggregate = "NONE" | "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";

/** A table instance placed on the canvas, with a query alias and position. */
export interface CanvasTable {
  id: string;
  sourceId: string;
  alias: string;
  x: number;
  y: number;
}

/** A join between two placed tables (referenced by canvas table id). */
export interface Join {
  id: string;
  type: JoinType;
  leftTableId: string;
  leftField: string;
  rightTableId: string;
  rightField: string;
}

/** A projected (SELECT) column referencing a placed table. */
export interface SelectColumn {
  id: string;
  tableId: string;
  field: string;
  alias?: string;
  aggregate: Aggregate;
}

/** An ORDER BY entry. */
export interface SortColumn {
  id: string;
  tableId: string;
  field: string;
  dir: "ASC" | "DESC";
}

/** A fully qualified field in the flattened multi-table catalog. */
export interface CatalogField {
  /** "alias.field" — used as the synthetic column key. */
  key: string;
  label: string;
  type: FieldType;
  tableId: string;
  alias: string;
  field: string;
  options?: string[];
}
