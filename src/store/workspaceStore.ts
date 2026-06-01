"use client";

import { create } from "zustand";
import { DATA_SOURCES } from "@/lib/datasources";
import { csvToDataSource } from "@/lib/csv";
import { createGroup, createRootGroup, createRule, uid, updateNode, addChild, removeNode } from "@/lib/tree";
import type {
  Aggregate,
  CanvasTable,
  DataSource,
  Join,
  JoinType,
  OperatorId,
  QueryGroup,
  SelectColumn,
  SortColumn,
  Combinator,
} from "@/lib/types";

/** Generate the next table alias: f, l, t1, t2 … (DBeaver-ish single letters). */
function nextAlias(existing: CanvasTable[], sourceId: string): string {
  const base = sourceId[0]?.toLowerCase() || "t";
  if (!existing.some((t) => t.alias === base)) return base;
  let i = 1;
  while (existing.some((t) => t.alias === `${base}${i}`)) i++;
  return `${base}${i}`;
}

interface WorkspaceState {
  sources: DataSource[];
  tables: CanvasTable[];
  joins: Join[];
  columns: SelectColumn[];
  sorts: SortColumn[];
  conditionRoot: QueryGroup;

  // canvas / tables
  addTable: (sourceId: string) => void;
  removeTable: (tableId: string) => void;
  moveTable: (tableId: string, x: number, y: number) => void;
  setAlias: (tableId: string, alias: string) => void;

  // sources / CSV
  importCsv: (text: string, fileName: string) => string;
  removeSource: (sourceId: string) => void;

  // joins
  addJoin: () => void;
  updateJoin: (id: string, patch: Partial<Join>) => void;
  removeJoin: (id: string) => void;

  // columns
  addColumn: (tableId: string, field: string) => void;
  updateColumn: (id: string, patch: Partial<SelectColumn>) => void;
  removeColumn: (id: string) => void;

  // sorts
  addSort: (tableId: string, field: string) => void;
  updateSort: (id: string, patch: Partial<SortColumn>) => void;
  removeSort: (id: string) => void;

  // conditions (recursive tree, operates on the flattened catalog)
  addRule: (groupId: string) => void;
  addGroup: (groupId: string) => void;
  removeNodeById: (id: string) => void;
  setField: (id: string, field: string) => void;
  setOperator: (id: string, operator: OperatorId) => void;
  setValue: (id: string, value: unknown) => void;
  setCombinator: (id: string, combinator: Combinator) => void;
  toggleNot: (id: string) => void;
  toggleCollapsed: (id: string) => void;

  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  sources: DATA_SOURCES,
  tables: [],
  joins: [],
  columns: [],
  sorts: [],
  conditionRoot: createRootGroup(),

  addTable: (sourceId) =>
    set((s) => {
      const alias = nextAlias(s.tables, sourceId);
      const offset = s.tables.length;
      const table: CanvasTable = {
        id: uid("tbl"),
        sourceId,
        alias,
        x: 40 + offset * 60,
        y: 40 + offset * 40,
      };
      return { tables: [...s.tables, table] };
    }),

  removeTable: (tableId) =>
    set((s) => ({
      tables: s.tables.filter((t) => t.id !== tableId),
      joins: s.joins.filter((j) => j.leftTableId !== tableId && j.rightTableId !== tableId),
      columns: s.columns.filter((c) => c.tableId !== tableId),
      sorts: s.sorts.filter((c) => c.tableId !== tableId),
    })),

  moveTable: (tableId, x, y) =>
    set((s) => ({ tables: s.tables.map((t) => (t.id === tableId ? { ...t, x, y } : t)) })),

  setAlias: (tableId, alias) =>
    set((s) => ({ tables: s.tables.map((t) => (t.id === tableId ? { ...t, alias } : t)) })),

  importCsv: (text, fileName) => {
    const { source } = csvToDataSource(text, fileName);
    set((s) => ({ sources: [...s.sources, source] }));
    return source.id;
  },

  removeSource: (sourceId) =>
    set((s) => ({
      sources: s.sources.filter((src) => src.id !== sourceId),
      tables: s.tables.filter((t) => t.sourceId !== sourceId),
    })),

  addJoin: () =>
    set((s) => {
      if (s.tables.length < 2) return s;
      const [a, b] = s.tables;
      const join: Join = {
        id: uid("join"),
        type: "INNER",
        leftTableId: a.id,
        leftField: sourceOf(s, a.sourceId)?.fields[0]?.name ?? "",
        rightTableId: b.id,
        rightField: sourceOf(s, b.sourceId)?.fields[0]?.name ?? "",
      };
      return { joins: [...s.joins, join] };
    }),

  updateJoin: (id, patch) =>
    set((s) => ({ joins: s.joins.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),

  removeJoin: (id) => set((s) => ({ joins: s.joins.filter((j) => j.id !== id) })),

  addColumn: (tableId, field) =>
    set((s) => ({
      columns: [...s.columns, { id: uid("col"), tableId, field, aggregate: "NONE" as Aggregate }],
    })),

  updateColumn: (id, patch) =>
    set((s) => ({ columns: s.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  removeColumn: (id) => set((s) => ({ columns: s.columns.filter((c) => c.id !== id) })),

  addSort: (tableId, field) =>
    set((s) => ({ sorts: [...s.sorts, { id: uid("sort"), tableId, field, dir: "ASC" }] })),

  updateSort: (id, patch) =>
    set((s) => ({ sorts: s.sorts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  removeSort: (id) => set((s) => ({ sorts: s.sorts.filter((c) => c.id !== id) })),

  addRule: (groupId) =>
    set((s) => ({ conditionRoot: addChild(s.conditionRoot, groupId, createRule()) })),

  addGroup: (groupId) =>
    set((s) => ({
      conditionRoot: addChild(s.conditionRoot, groupId, createGroup("AND", [createRule()])),
    })),

  removeNodeById: (id) => set((s) => ({ conditionRoot: removeNode(s.conditionRoot, id) })),

  setField: (id, field) =>
    set((s) => ({
      conditionRoot: updateNode(s.conditionRoot, id, (n) =>
        n.type === "rule" ? { ...n, field, operator: null, value: "" } : n
      ),
    })),

  setOperator: (id, operator) =>
    set((s) => ({
      conditionRoot: updateNode(s.conditionRoot, id, (n) =>
        n.type === "rule" ? { ...n, operator, value: "" } : n
      ),
    })),

  setValue: (id, value) =>
    set((s) => ({
      conditionRoot: updateNode(s.conditionRoot, id, (n) =>
        n.type === "rule" ? { ...n, value } : n
      ),
    })),

  setCombinator: (id, combinator) =>
    set((s) => ({
      conditionRoot: updateNode(s.conditionRoot, id, (n) =>
        n.type === "group" ? { ...n, combinator } : n
      ),
    })),

  toggleNot: (id) =>
    set((s) => ({
      conditionRoot: updateNode(s.conditionRoot, id, (n) =>
        n.type === "group" ? { ...n, not: !n.not } : n
      ),
    })),

  toggleCollapsed: (id) =>
    set((s) => ({
      conditionRoot: updateNode(s.conditionRoot, id, (n) =>
        n.type === "group" ? { ...n, collapsed: !n.collapsed } : n
      ),
    })),

  reset: () =>
    set({ tables: [], joins: [], columns: [], sorts: [], conditionRoot: createRootGroup() }),
}));

function sourceOf(s: { sources: DataSource[] }, id: string): DataSource | undefined {
  return s.sources.find((src) => src.id === id);
}

export type { JoinType };
