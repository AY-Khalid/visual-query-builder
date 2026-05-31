import { getOperator, isOperatorValidForType } from "./operators";
import type { DataSource, QueryGroup, QueryNode, QueryRule, ValidationIssue } from "./types";
import { isGroup } from "./types";

function validateRule(rule: QueryRule, source: DataSource): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!rule.field) {
    issues.push({ nodeId: rule.id, message: "Select a field." });
    return issues;
  }
  const field = source.fields.find((f) => f.name === rule.field);
  if (!field) {
    issues.push({ nodeId: rule.id, message: `Unknown field "${rule.field}".` });
    return issues;
  }
  if (!rule.operator) {
    issues.push({ nodeId: rule.id, message: "Select an operator." });
    return issues;
  }
  if (!isOperatorValidForType(rule.operator, field.type)) {
    issues.push({ nodeId: rule.id, message: `Operator not allowed on ${field.type} fields.` });
    return issues;
  }
  const op = getOperator(rule.operator)!;

  if (op.arity === 0) return issues; // null checks need no value

  if (op.arity === 2) {
    const arr = Array.isArray(rule.value) ? rule.value : [];
    const [a, b] = arr;
    if (a === undefined || a === "" || b === undefined || b === "") {
      issues.push({ nodeId: rule.id, message: "Both bounds are required." });
    } else if (field.type === "number" && Number(a) > Number(b)) {
      issues.push({ nodeId: rule.id, message: "Min must be <= max." });
    } else if (field.type === "date" && String(a) > String(b)) {
      issues.push({ nodeId: rule.id, message: "Start date must be before end date." });
    }
    return issues;
  }

  // arity 1
  if (rule.operator === "in") {
    const arr = Array.isArray(rule.value)
      ? rule.value
      : String(rule.value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (arr.length === 0) issues.push({ nodeId: rule.id, message: "Provide at least one value." });
    return issues;
  }

  if (rule.value === "" || rule.value === null || rule.value === undefined) {
    issues.push({ nodeId: rule.id, message: "Value is required." });
    return issues;
  }

  if (field.type === "number" && Number.isNaN(Number(rule.value))) {
    issues.push({ nodeId: rule.id, message: "Value must be a number." });
  }

  if (rule.operator === "regex") {
    try {
      new RegExp(String(rule.value));
    } catch {
      issues.push({ nodeId: rule.id, message: "Invalid regular expression." });
    }
  }

  return issues;
}

/** Recursively collect all validation issues across the tree. */
export function validateTree(node: QueryNode, source: DataSource): ValidationIssue[] {
  if (isGroup(node)) {
    const own: ValidationIssue[] =
      node.children.length === 0
        ? [{ nodeId: node.id, message: "Group is empty — add a condition or remove it." }]
        : [];
    return node.children.reduce<ValidationIssue[]>(
      (acc, child) => acc.concat(validateTree(child, source)),
      own
    );
  }
  return validateRule(node, source);
}

export function isTreeValid(root: QueryGroup, source: DataSource): boolean {
  return validateTree(root, source).length === 0;
}
