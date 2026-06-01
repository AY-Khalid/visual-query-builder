"use client";

import { create } from "zustand";
import { DATA_SOURCES } from "@/lib/datasources";
import { csvToDataSource } from "@/lib/csv";
import { createGroup, createRule, uid, updateNode, addChild, removeNode } from "@/lib/tree";
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

const HISTORY_LIMIT = 50;

/** The subset of state that participates in undo/redo. */
interface Snapshot {
  tables: CanvasTable[];
  joins: Join[];
  columns: SelectColumn[];
  sorts: SortColumn[];
  conditionRoot: QueryGroup;
}

function snap(s: Snapshot): Snapshot {
  return {
    tables: s.tables,
    joins: s.joins,
    columns: s.columns,
    sorts: s.sorts,
    conditionRoot: s.conditionRoot,
  };
}

/** Generate the next table alias: u, p, t1, t2 … */
function nextAlias(existing: CanvasTable[], sourceId: string): string {
  const base = sourceId[0]?.toLowerCase() || "t";
  if (!existing.some((t) => t.alias === base)) return base;
  let i = 1;
  while (existing.some((t) => t.alias === `${base}${i}`)) i++;
  return `${base}${i}`;
}

interface WorkspaceState extends Snapshot {
  sources: DataSource[];
  past: Snapshot[];
  future: Snapshot[];

  // canvas / tables
  addTable: (sourceId: string) => void;
  removeTable: (tableId: string) => void;
  moveTable: (tableId: string, x: number, y: number) => void;
  setAlias: (tableId: string, alias: string) => void;

  // sources / CSV (not part of undo history)
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

  // conditions (recursive tree over the flattened catalog)
  addRule: (groupId: string) => void;
  addGroup: (groupId: string) => void;
  removeNodeById: (id: string) => void;
  setField: (id: string, field: string) => void;
  setOperator: (id: string, operator: OperatorId) => void;
  setValue: (id: string, value: unknown) => void;
  setCombinator: (id: string, combinator: Combinator) => void;
  toggleNot: (id: string) => void;
  toggleCollapsed: (id: string) => void;

  // history
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
  /** Apply a data change, recording the previous snapshot for undo. */
  const commit = (producer: (s: WorkspaceState) => Partial<Snapshot>) =>
    set((s) => ({
      ...producer(s),
      past: [...s.past, snap(s)].slice(-HISTORY_LIMIT),
      future: [],
    }));

  return {
    sources: DATA_SOURCES,
    // Start with no conditions attached — the query runs with no filter by default.
    tables: [],
    joins: [],
    columns: [],
    sorts: [],
    conditionRoot: createGroup("AND", []),
    past: [],
    future: [],

    addTable: (sourceId) =>
      commit((s) => {
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
      commit((s) => ({
        tables: s.tables.filter((t) => t.id !== tableId),
        joins: s.joins.filter((j) => j.leftTableId !== tableId && j.rightTableId !== tableId),
        columns: s.columns.filter((c) => c.tableId !== tableId),
        sorts: s.sorts.filter((c) => c.tableId !== tableId),
      })),

    // dragging is high-frequency; do not flood history with every pixel
    moveTable: (tableId, x, y) =>
      set((s) => ({ tables: s.tables.map((t) => (t.id === tableId ? { ...t, x, y } : t)) })),

    setAlias: (tableId, alias) =>
      commit((s) => ({ tables: s.tables.map((t) => (t.id === tableId ? { ...t, alias } : t)) })),

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
      commit((s) => {
        if (s.tables.length < 2) return {};
        const [a, b] = s.tables;
        const fa = s.sources.find((x) => x.id === a.sourceId)?.fields[0]?.name ?? "";
        const fb = s.sources.find((x) => x.id === b.sourceId)?.fields[0]?.name ?? "";
        const join: Join = {
          id: uid("join"),
          type: "INNER",
          leftTableId: a.id,
          leftField: fa,
          rightTableId: b.id,
          rightField: fb,
        };
        return { joins: [...s.joins, join] };
      }),

    updateJoin: (id, patch) =>
      commit((s) => ({ joins: s.joins.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),

    removeJoin: (id) => commit((s) => ({ joins: s.joins.filter((j) => j.id !== id) })),

    addColumn: (tableId, field) =>
      commit((s) => ({
        columns: [...s.columns, { id: uid("col"), tableId, field, aggregate: "NONE" as Aggregate }],
      })),

    updateColumn: (id, patch) =>
      commit((s) => ({ columns: s.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

    removeColumn: (id) => commit((s) => ({ columns: s.columns.filter((c) => c.id !== id) })),

    addSort: (tableId, field) =>
      commit((s) => ({ sorts: [...s.sorts, { id: uid("sort"), tableId, field, dir: "ASC" }] })),

    updateSort: (id, patch) =>
      commit((s) => ({ sorts: s.sorts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

    removeSort: (id) => commit((s) => ({ sorts: s.sorts.filter((c) => c.id !== id) })),

    addRule: (groupId) =>
      commit((s) => ({ conditionRoot: addChild(s.conditionRoot, groupId, createRule()) })),

    addGroup: (groupId) =>
      commit((s) => ({
        conditionRoot: addChild(s.conditionRoot, groupId, createGroup("AND", [createRule()])),
      })),

    removeNodeById: (id) => commit((s) => ({ conditionRoot: removeNode(s.conditionRoot, id) })),

    setField: (id, field) =>
      commit((s) => ({
        conditionRoot: updateNode(s.conditionRoot, id, (n) =>
          n.type === "rule" ? { ...n, field, operator: null, value: "" } : n
        ),
      })),

    setOperator: (id, operator) =>
      commit((s) => ({
        conditionRoot: updateNode(s.conditionRoot, id, (n) =>
          n.type === "rule" ? { ...n, operator, value: "" } : n
        ),
      })),

    setValue: (id, value) =>
      commit((s) => ({
        conditionRoot: updateNode(s.conditionRoot, id, (n) =>
          n.type === "rule" ? { ...n, value } : n
        ),
      })),

    setCombinator: (id, combinator) =>
      commit((s) => ({
        conditionRoot: updateNode(s.conditionRoot, id, (n) =>
          n.type === "group" ? { ...n, combinator } : n
        ),
      })),

    toggleNot: (id) =>
      commit((s) => ({
        conditionRoot: updateNode(s.conditionRoot, id, (n) =>
          n.type === "group" ? { ...n, not: !n.not } : n
        ),
      })),

    // collapse is a view preference — not part of history
    toggleCollapsed: (id) =>
      set((s) => ({
        conditionRoot: updateNode(s.conditionRoot, id, (n) =>
          n.type === "group" ? { ...n, collapsed: !n.collapsed } : n
        ),
      })),

    undo: () =>
      set((s) => {
        if (s.past.length === 0) return s;
        const prev = s.past[s.past.length - 1];
        return { ...prev, past: s.past.slice(0, -1), future: [snap(s), ...s.future].slice(0, HISTORY_LIMIT) };
      }),

    redo: () =>
      set((s) => {
        if (s.future.length === 0) return s;
        const next = s.future[0];
        return { ...next, past: [...s.past, snap(s)].slice(-HISTORY_LIMIT), future: s.future.slice(1) };
      }),

    reset: () =>
      commit(() => ({
        tables: [],
        joins: [],
        columns: [],
        sorts: [],
        conditionRoot: createGroup("AND", []),
      })),
  };
});

export type { JoinType };
