import { describe, expect, it } from "vitest";
import { exportQuery, importQuery } from "@/lib/serialize";
import { createGroup, createRule } from "@/lib/tree";

describe("serialize", () => {
  it("round-trips a query document", () => {
    const root = createGroup("AND", [createRule({ field: "age", operator: "gt", value: 18 })]);
    const json = exportQuery("users", root);
    const { sourceId, root: back } = importQuery(json);
    expect(sourceId).toBe("users");
    expect(back.children).toHaveLength(1);
    expect(back.children[0].type).toBe("rule");
  });

  it("throws on invalid JSON", () => {
    expect(() => importQuery("{not json")).toThrow(/valid JSON/i);
  });

  it("throws on a node with an unknown type", () => {
    const bad = JSON.stringify({ sourceId: "users", root: { type: "bogus" } });
    expect(() => importQuery(bad)).toThrow(/group.*rule|type/i);
  });

  it("sanitizes malicious/oversized values", () => {
    const evil = {
      sourceId: "users",
      root: {
        type: "group",
        combinator: "AND",
        children: [{ type: "rule", field: "name", operator: "eq", value: { nested: "obj" } }],
      },
    };
    const { root } = importQuery(JSON.stringify(evil));
    const rule = root.children[0];
    expect(rule.type).toBe("rule");
    expect(rule.type === "rule" && rule.value).toBe(""); // object dropped
  });

  it("rejects excessively deep structures", () => {
    let node: any = { type: "rule", field: "a", operator: "eq", value: 1 };
    for (let i = 0; i < 100; i++) {
      node = { type: "group", combinator: "AND", children: [node] };
    }
    expect(() => importQuery(JSON.stringify({ sourceId: "users", root: node }))).toThrow(
      /too deep/i
    );
  });

  it("defaults an invalid combinator to AND", () => {
    const doc = JSON.stringify({
      sourceId: "users",
      root: { type: "group", combinator: "XOR", children: [] },
    });
    expect(importQuery(doc).root.combinator).toBe("AND");
  });
});
