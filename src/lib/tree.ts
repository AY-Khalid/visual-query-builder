import type { Combinator, QueryGroup, QueryNode, QueryRule } from "./types";
import { isGroup } from "./types";

/** Collision-resistant id without external deps. */
export function uid(prefix = "n"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createRule(partial: Partial<QueryRule> = {}): QueryRule {
  return {
    id: uid("rule"),
    type: "rule",
    field: null,
    operator: null,
    value: "",
    ...partial,
  };
}

export function createGroup(combinator: Combinator = "AND", children: QueryNode[] = []): QueryGroup {
  return {
    id: uid("grp"),
    type: "group",
    combinator,
    not: false,
    collapsed: false,
    children,
  };
}

export function createRootGroup(): QueryGroup {
  return createGroup("AND", [createRule()]);
}

/**
 * Immutably map over the tree, returning a new tree. `fn` receives each node
 * and returns a replacement node (or the same reference to skip). Children are
 * processed depth-first before the parent.
 */
export function mapTree(node: QueryNode, fn: (n: QueryNode) => QueryNode): QueryNode {
  if (isGroup(node)) {
    const children = node.children.map((c) => mapTree(c, fn));
    const changed = children.some((c, i) => c !== node.children[i]);
    const next = changed ? { ...node, children } : node;
    return fn(next);
  }
  return fn(node);
}

/** Immutably update a single node by id. */
export function updateNode(root: QueryGroup, id: string, updater: (n: QueryNode) => QueryNode): QueryGroup {
  return mapTree(root, (n) => (n.id === id ? updater(n) : n)) as QueryGroup;
}

/** Immutably add a child node into the group with the given id. */
export function addChild(root: QueryGroup, groupId: string, child: QueryNode): QueryGroup {
  return mapTree(root, (n) => {
    if (n.id === groupId && isGroup(n)) {
      return { ...n, children: [...n.children, child] };
    }
    return n;
  }) as QueryGroup;
}

/** Immutably remove a node by id (cannot remove the root). */
export function removeNode(root: QueryGroup, id: string): QueryGroup {
  return mapTree(root, (n) => {
    if (isGroup(n) && n.children.some((c) => c.id === id)) {
      return { ...n, children: n.children.filter((c) => c.id !== id) };
    }
    return n;
  }) as QueryGroup;
}

/** Find a node by id (read-only). */
export function findNode(root: QueryNode, id: string): QueryNode | undefined {
  if (root.id === id) return root;
  if (isGroup(root)) {
    for (const c of root.children) {
      const found = findNode(c, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Find the id of the parent group that directly contains `id`. */
export function findParentId(root: QueryGroup, id: string): string | null {
  for (const c of root.children) {
    if (c.id === id) return root.id;
    if (isGroup(c)) {
      const p = findParentId(c, id);
      if (p) return p;
    }
  }
  return null;
}

/**
 * Reorder siblings within the group identified by groupId, moving the item from
 * `fromIndex` to `toIndex`. Immutable.
 */
export function reorderChildren(root: QueryGroup, groupId: string, fromIndex: number, toIndex: number): QueryGroup {
  return mapTree(root, (n) => {
    if (n.id === groupId && isGroup(n)) {
      const next = [...n.children];
      const [moved] = next.splice(fromIndex, 1);
      if (moved === undefined) return n;
      next.splice(toIndex, 0, moved);
      return { ...n, children: next };
    }
    return n;
  }) as QueryGroup;
}

/** Count total nodes (groups + rules). */
export function countNodes(node: QueryNode): number {
  if (isGroup(node)) {
    return 1 + node.children.reduce((acc, c) => acc + countNodes(c), 0);
  }
  return 1;
}

/** Maximum nesting depth of groups. */
export function maxDepth(node: QueryNode, depth = 0): number {
  if (isGroup(node)) {
    if (node.children.length === 0) return depth;
    return Math.max(...node.children.map((c) => maxDepth(c, depth + 1)));
  }
  return depth;
}
