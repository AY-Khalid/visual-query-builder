import { describe, expect, it } from "vitest";
import {
  addChild,
  countNodes,
  createGroup,
  createRule,
  findNode,
  findParentId,
  maxDepth,
  removeNode,
  reorderChildren,
  updateNode,
} from "@/lib/tree";
import { isGroup } from "@/lib/types";

describe("recursive tree operations", () => {
  it("adds a child immutably", () => {
    const root = createGroup("AND", []);
    const next = addChild(root, root.id, createRule());
    expect(root.children).toHaveLength(0); // original untouched
    expect(next.children).toHaveLength(1);
    expect(next).not.toBe(root);
  });

  it("updates a deeply nested node without mutating siblings", () => {
    const rule = createRule({ field: "age" });
    const inner = createGroup("OR", [rule]);
    const root = createGroup("AND", [createRule(), inner]);

    const next = updateNode(root, rule.id, (n) =>
      n.type === "rule" ? { ...n, operator: "gt", value: 5 } : n
    );
    const found = findNode(next, rule.id);
    expect(found && found.type === "rule" && found.operator).toBe("gt");
    // untouched sibling reference is preserved (structural sharing)
    expect(next.children[0]).toBe(root.children[0]);
  });

  it("removes a nested node", () => {
    const rule = createRule();
    const root = createGroup("AND", [createGroup("AND", [rule])]);
    const next = removeNode(root, rule.id);
    expect(findNode(next, rule.id)).toBeUndefined();
  });

  it("reorders siblings", () => {
    const a = createRule({ field: "a" });
    const b = createRule({ field: "b" });
    const c = createRule({ field: "c" });
    const root = createGroup("AND", [a, b, c]);
    const next = reorderChildren(root, root.id, 0, 2);
    expect(next.children.map((n) => (n.type === "rule" ? n.field : ""))).toEqual(["b", "c", "a"]);
  });

  it("finds parent id and computes depth/count", () => {
    const rule = createRule();
    const inner = createGroup("AND", [rule]);
    const root = createGroup("AND", [inner]);
    expect(findParentId(root, rule.id)).toBe(inner.id);
    expect(findParentId(root, inner.id)).toBe(root.id);
    expect(maxDepth(root)).toBe(2);
    expect(countNodes(root)).toBe(3);
  });

  it("supports unlimited nesting depth", () => {
    let node = createGroup("AND", [createRule()]);
    for (let i = 0; i < 20; i++) {
      node = createGroup("AND", [node]);
    }
    expect(isGroup(node)).toBe(true);
    expect(maxDepth(node)).toBe(21);
  });
});
