import type { FieldType, OperatorId } from "./types";

export interface OperatorDef {
  id: OperatorId;
  label: string;
  /** SQL symbol/keyword used by the generator. */
  sql: string;
  /** Field types this operator is valid for. */
  types: FieldType[];
  /** How many value inputs are needed: 0, 1, or 2. */
  arity: 0 | 1 | 2;
}

export const OPERATORS: OperatorDef[] = [
  { id: "eq", label: "Equals", sql: "=", types: ["string", "number", "boolean", "enum", "date"], arity: 1 },
  { id: "neq", label: "Not equals", sql: "!=", types: ["string", "number", "boolean", "enum", "date"], arity: 1 },
  { id: "contains", label: "Contains", sql: "LIKE", types: ["string"], arity: 1 },
  { id: "startsWith", label: "Starts with", sql: "LIKE", types: ["string"], arity: 1 },
  { id: "endsWith", label: "Ends with", sql: "LIKE", types: ["string"], arity: 1 },
  { id: "gt", label: "Greater than", sql: ">", types: ["number", "date"], arity: 1 },
  { id: "gte", label: "Greater or equal", sql: ">=", types: ["number", "date"], arity: 1 },
  { id: "lt", label: "Less than", sql: "<", types: ["number", "date"], arity: 1 },
  { id: "lte", label: "Less or equal", sql: "<=", types: ["number", "date"], arity: 1 },
  { id: "in", label: "In list", sql: "IN", types: ["string", "number", "enum"], arity: 1 },
  { id: "between", label: "Between", sql: "BETWEEN", types: ["number", "date"], arity: 2 },
  { id: "regex", label: "Matches regex", sql: "REGEXP", types: ["string"], arity: 1 },
  { id: "isNull", label: "Is null", sql: "IS NULL", types: ["string", "number", "boolean", "enum", "date"], arity: 0 },
  { id: "isNotNull", label: "Is not null", sql: "IS NOT NULL", types: ["string", "number", "boolean", "enum", "date"], arity: 0 },
];

const OP_MAP = new Map(OPERATORS.map((o) => [o.id, o]));

export function getOperator(id: OperatorId): OperatorDef | undefined {
  return OP_MAP.get(id);
}

/** Operators valid for a given field type. */
export function operatorsForType(type: FieldType): OperatorDef[] {
  return OPERATORS.filter((o) => o.types.includes(type));
}

export function isOperatorValidForType(id: OperatorId, type: FieldType): boolean {
  return getOperator(id)?.types.includes(type) ?? false;
}
