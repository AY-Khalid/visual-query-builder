import { describe, expect, it } from "vitest";
import { executeQuery } from "@/lib/execute";
import { createGroup, createRule } from "@/lib/tree";
import type { DataSource } from "@/lib/types";

const source: DataSource = {
  id: "t",
  name: "T",
  fields: [
    { name: "age", label: "Age", type: "number" },
    { name: "country", label: "Country", type: "enum", options: ["NG", "US"] },
    { name: "status", label: "Status", type: "enum", options: ["active", "inactive"] },
    { name: "name", label: "Name", type: "string" },
  ],
  rows: [
    { age: 20, country: "NG", status: "active", name: "Ada" },
    { age: 17, country: "NG", status: "inactive", name: "Bola" },
    { age: 40, country: "US", status: "active", name: "Chidi" },
    { age: 30, country: "US", status: "inactive", name: "Dayo" },
  ],
};

describe("executeQuery", () => {
  it("filters with a single rule", () => {
    const root = createGroup("AND", [createRule({ field: "age", operator: "gt", value: 18 })]);
    const { total } = executeQuery(root, source);
    expect(total).toBe(3);
  });

  it("applies AND logic", () => {
    const root = createGroup("AND", [
      createRule({ field: "age", operator: "gt", value: 18 }),
      createRule({ field: "status", operator: "eq", value: "active" }),
    ]);
    expect(executeQuery(root, source).total).toBe(2);
  });

  it("applies nested OR logic", () => {
    const root = createGroup("OR", [
      createGroup("AND", [
        createRule({ field: "age", operator: "gt", value: 18 }),
        createRule({ field: "country", operator: "eq", value: "NG" }),
      ]),
      createGroup("AND", [createRule({ field: "status", operator: "eq", value: "active" })]),
    ]);
    // (age>18 & NG) -> Ada ; status active -> Ada, Chidi  => 2 unique
    expect(executeQuery(root, source).total).toBe(2);
  });

  it("honors NOT on a group", () => {
    const root = createGroup("AND", [], );
    root.not = true;
    root.children = [createRule({ field: "country", operator: "eq", value: "NG" })];
    expect(executeQuery(root, source).total).toBe(2); // the two US rows
  });

  it("supports string contains case-insensitively", () => {
    const root = createGroup("AND", [createRule({ field: "name", operator: "contains", value: "a" })]);
    expect(executeQuery(root, source).total).toBe(3); // Ada, Bola, Dayo
  });

  it("sorts results", () => {
    const root = createGroup("AND", []);
    const { rows } = executeQuery(root, source, { sortBy: "age", sortDir: "desc" });
    expect(rows.map((r) => r.age)).toEqual([40, 30, 20, 17]);
  });
});
