import { describe, expect, it } from "vitest";
import { isTreeValid, validateTree } from "@/lib/validation";
import { getDataSource } from "@/lib/datasources";
import { createGroup, createRule } from "@/lib/tree";

const users = getDataSource("users")!;

describe("validateTree", () => {
  it("flags missing field/operator/value", () => {
    expect(validateTree(createRule(), users)[0].message).toMatch(/field/i);
    expect(validateTree(createRule({ field: "age" }), users)[0].message).toMatch(/operator/i);
    expect(
      validateTree(createRule({ field: "age", operator: "gt", value: "" }), users)[0].message
    ).toMatch(/required/i);
  });

  it("rejects operators incompatible with field type", () => {
    const r = createRule({ field: "age", operator: "contains", value: "5" });
    expect(validateTree(r, users)[0].message).toMatch(/not allowed/i);
  });

  it("rejects non-numeric values for number fields", () => {
    const r = createRule({ field: "age", operator: "gt", value: "abc" });
    expect(validateTree(r, users)[0].message).toMatch(/number/i);
  });

  it("validates between bounds order", () => {
    const r = createRule({ field: "age", operator: "between", value: [30, 10] });
    expect(validateTree(r, users)[0].message).toMatch(/<=|max/i);
  });

  it("flags invalid regex", () => {
    const r = createRule({ field: "name", operator: "regex", value: "([" });
    expect(validateTree(r, users)[0].message).toMatch(/regular expression/i);
  });

  it("flags empty groups", () => {
    expect(validateTree(createGroup("AND", []), users)[0].message).toMatch(/empty/i);
  });

  it("passes a well-formed tree", () => {
    const root = createGroup("AND", [createRule({ field: "age", operator: "gt", value: 18 })]);
    expect(isTreeValid(root, users)).toBe(true);
  });
});
