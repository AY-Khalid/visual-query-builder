"use client";

import { create } from "zustand";
import { DATA_SOURCES } from "@/lib/datasources";
import type { Combinator, OperatorId, QueryGroup, SavedQuery } from "@/lib/types";
import {
  addChild,
  createGroup,
  createRootGroup,
  createRule,
  findParentId,
  removeNode,
  reorderChildren,
  uid,
  updateNode,
} from "@/lib/tree";

const HISTORY_LIMIT = 50;

interface QueryState {
  sourceId: string;
  root: QueryGroup;
  past: QueryGroup[];
  future: QueryGroup[];
  saved: SavedQuery[];

  // mutations
  setSource: (id: string) => void;
  replaceTree: (root: QueryGroup, sourceId?: string) => void;
  addRule: (groupId: string) => void;
  addGroup: (groupId: string) => void;
  removeNodeById: (id: string) => void;
  setField: (id: string, field: string) => void;
  setOperator: (id: string, operator: OperatorId) => void;
  setValue: (id: string, value: unknown) => void;
  setCombinator: (id: string, combinator: Combinator) => void;
  toggleNot: (id: string) => void;
  toggleCollapsed: (id: string) => void;
  reorder: (groupId: string, from: number, to: number) => void;

  // history
  undo: () => void;
  redo: () => void;
  reset: () => void;

  // presets
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
}

/** Commit a new root, pushing the previous one onto the undo stack. */
function commit(state: QueryState, root: QueryGroup): Partial<QueryState> {
  const past = [...state.past, state.root].slice(-HISTORY_LIMIT);
  return { root, past, future: [] };
}

export const useQueryStore = create<QueryState>((set, get) => ({
  sourceId: DATA_SOURCES[0].id,
  root: createRootGroup(),
  past: [],
  future: [],
  saved: [],

  setSource: (id) => set({ sourceId: id, root: createRootGroup(), past: [], future: [] }),

  replaceTree: (root, sourceId) =>
    set((s) => ({ ...commit(s, root), ...(sourceId ? { sourceId } : {}) })),

  addRule: (groupId) => set((s) => commit(s, addChild(s.root, groupId, createRule()))),

  addGroup: (groupId) =>
    set((s) => commit(s, addChild(s.root, groupId, createGroup("AND", [createRule()])))),

  removeNodeById: (id) => set((s) => commit(s, removeNode(s.root, id))),

  setField: (id, field) =>
    set((s) =>
      commit(
        s,
        updateNode(s.root, id, (n) =>
          n.type === "rule" ? { ...n, field, operator: null, value: "" } : n
        )
      )
    ),

  setOperator: (id, operator) =>
    set((s) =>
      commit(
        s,
        updateNode(s.root, id, (n) => (n.type === "rule" ? { ...n, operator, value: "" } : n))
      )
    ),

  setValue: (id, value) =>
    set((s) =>
      commit(s, updateNode(s.root, id, (n) => (n.type === "rule" ? { ...n, value } : n)))
    ),

  setCombinator: (id, combinator) =>
    set((s) =>
      commit(s, updateNode(s.root, id, (n) => (n.type === "group" ? { ...n, combinator } : n)))
    ),

  toggleNot: (id) =>
    set((s) =>
      commit(s, updateNode(s.root, id, (n) => (n.type === "group" ? { ...n, not: !n.not } : n)))
    ),

  // collapse is UI-only state; do not push to undo history
  toggleCollapsed: (id) =>
    set((s) => ({
      root: updateNode(s.root, id, (n) =>
        n.type === "group" ? { ...n, collapsed: !n.collapsed } : n
      ),
    })),

  reorder: (groupId, from, to) => set((s) => commit(s, reorderChildren(s.root, groupId, from, to))),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      return {
        root: previous,
        past: s.past.slice(0, -1),
        future: [s.root, ...s.future].slice(0, HISTORY_LIMIT),
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        root: next,
        past: [...s.past, s.root].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
      };
    }),

  reset: () => set((s) => commit(s, createRootGroup())),

  savePreset: (name) =>
    set((s) => ({
      saved: [
        { id: uid("saved"), name, sourceId: s.sourceId, root: s.root, createdAt: Date.now() },
        ...s.saved,
      ],
    })),

  loadPreset: (id) => {
    const preset = get().saved.find((p) => p.id === id);
    if (!preset) return;
    set((s) => ({ ...commit(s, preset.root), sourceId: preset.sourceId }));
  },

  deletePreset: (id) => set((s) => ({ saved: s.saved.filter((p) => p.id !== id) })),
}));

/** Helper exposed for components: parent group id of a node. */
export function parentOf(root: QueryGroup, id: string): string | null {
  return findParentId(root, id);
}
