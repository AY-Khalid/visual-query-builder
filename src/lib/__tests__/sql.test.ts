import { describe, expect, it } from "vitest";
import { generateSql, ruleToSql } from "@/lib/sql";
import { getDataSource } from "@/lib/datasources";
import { createGroup, createRule } from "@/lib/tree";
import type { QueryGroup } from "@/lib/types";

const users = getDataSource("users")!;

describe("ruleToSql", () => {
  it("returns null for incomplete rules", () => {
    expect(ruleToSql(createRule(), users)).toBeNull();
    expect(ruleToSql(createRule({ field: "age" }), users)).toBeNull();
  });

  it("renders numeric comparison", () => {
    const r = createRule({ field: "age", operator: "gt", value: 18 });
    expect(ruleToSql(r, users)).toBe("age > 18");
  });

  it("quotes string equality and enums", () => {
    expect(ruleToSql(createRule({ field: "name", operator: "eq", value: "Ada" }), users)).toBe(
      "name = 'Ada'"
    );
    expect(
      ruleToSql(createRule({ field: "country", operator: "eq", value: "Nigeria" }), users)
    ).toBe("country = 'Nigeria'");
  });

  it("escapes single quotes to prevent injection", () => {
    const r = createRule({ field: "name", operator: "eq", value: "O'Brien" });
    expect(ruleToSql(r, users)).toBe("name = 'O''Brien'");
  });

  it("builds LIKE patterns for contains/startsWith/endsWith", () => {
    expect(ruleToSql(createRule({ field: "name", operator: "contains", value: "da" }), users)).toBe(
      "name LIKE '%da%'"
    );
    expect(
      ruleToSql(createRule({ field: "name", operator: "startsWith", value: "Ad" }), users)
    ).toBe("name LIKE 'Ad%'");
  });

  it("builds IN and BETWEEN", () => {
    expect(
      ruleToSql(createRule({ field: "age", operator: "in", value: [18, 21] }), users)
    ).toBe("age IN (18, 21)");
    expect(
      ruleToSql(createRule({ field: "age", operator: "between", value: [18, 30] }), users)
    ).toBe("age BETWEEN 18 AND 30");
  });

  it("handles null checks", () => {
    expect(ruleToSql(createRule({ field: "age", operator: "isNull" }), users)).toBe("age IS NULL");
    expect(ruleToSql(createRule({ field: "age", operator: "isNotNull" }), users)).toBe(
      "age IS NOT NULL"
    );
  });
});

describe("generateSql", () => {
  it("emits a bare SELECT when the tree is empty", () => {
    expect(generateSql(createGroup(), users)).toBe("SELECT *\nFROM users;");
  });

  it("joins multiple rules with the combinator", () => {
    const root: QueryGroup = createGroup("AND", [
      createRule({ field: "age", operator: "gt", value: 18 }),
      createRule({ field: "status", operator: "eq", value: "active" }),
    ]);
    expect(generateSql(root, users)).toBe(
      "SELECT *\nFROM users\nWHERE age > 18 AND status = 'active';"
    );
  });

  it("wraps nested groups with parentheses and supports OR + NOT", () => {
    const nested: QueryGroup = createGroup("OR", [
      createGroup("AND", [
        createRule({ field: "age", operator: "gt", value: 18 }),
        createRule({ field: "country", operator: "eq", value: "Nigeria" }),
      ]),
      createGroup("AND", [
        createRule({ field: "status", operator: "eq", value: "active" }),
        createRule({ field: "purchases", operator: "gt", value: 10 }),
      ]),
    ]);
    expect(generateSql(nested, users)).toBe(
      "SELECT *\nFROM users\nWHERE (age > 18 AND country = 'Nigeria') OR (status = 'active' AND purchases > 10);"
    );
  });

  it("skips incomplete rules in output", () => {
    const root = createGroup("AND", [
      createRule({ field: "age", operator: "gt", value: 18 }),
      createRule(),
    ]);
    expect(generateSql(root, users)).toBe("SELECT *\nFROM users\nWHERE age > 18;");
  });
});
