"use client";

import { memo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Combinator, DataSource, QueryGroup, QueryNode } from "@/lib/types";
import { isGroup } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useQueryStore } from "@/store/queryStore";
import { RuleRow } from "./RuleRow";

interface GroupProps {
  group: QueryGroup;
  source: DataSource;
  issues: Map<string, string>;
  depth?: number;
  isRoot?: boolean;
}

const handleCls =
  "cursor-grab touch-none select-none rounded px-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200";

function DragHandle({ attributes, listeners }: { attributes: any; listeners: any }) {
  return (
    <span className={handleCls} aria-label="Drag to reorder" {...attributes} {...listeners}>
      ⠿
    </span>
  );
}

/** Wraps a child node so it can be sorted within its parent group. */
function SortableChild({
  node,
  source,
  issues,
  depth,
}: {
  node: QueryNode;
  source: DataSource;
  issues: Map<string, string>;
  depth: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const handle = <DragHandle attributes={attributes} listeners={listeners} />;

  return (
    <div ref={setNodeRef} style={style}>
      {isGroup(node) ? (
        <GroupNode group={node} source={source} issues={issues} depth={depth + 1} />
      ) : (
        <RuleRow rule={node} source={source} error={issues.get(node.id)} dragHandle={handle} />
      )}
    </div>
  );
}

const COMBINATOR_COLORS: Record<Combinator, string> = {
  AND: "bg-indigo-600",
  OR: "bg-amber-600",
};

function GroupNodeBase({ group, source, issues, depth = 0, isRoot = false }: GroupProps) {
  const addRule = useQueryStore((s) => s.addRule);
  const addGroup = useQueryStore((s) => s.addGroup);
  const removeNodeById = useQueryStore((s) => s.removeNodeById);
  const setCombinator = useQueryStore((s) => s.setCombinator);
  const toggleNot = useQueryStore((s) => s.toggleNot);
  const toggleCollapsed = useQueryStore((s) => s.toggleCollapsed);
  const reorder = useQueryStore((s) => s.reorder);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = group.children.findIndex((c) => c.id === active.id);
    const to = group.children.findIndex((c) => c.id === over.id);
    if (from === -1 || to === -1) return;
    reorder(group.id, from, to);
  }

  const groupError = issues.get(group.id);

  return (
    <div
      data-testid={`group-${group.id}`}
      className={cn(
        "animate-fade-in rounded-xl border-l-4 p-3",
        group.combinator === "AND" ? "border-l-indigo-500" : "border-l-amber-500",
        isRoot
          ? "border border-slate-200 bg-slate-100/60 dark:border-slate-800 dark:bg-slate-900/40"
          : "border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60"
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label={group.collapsed ? "Expand group" : "Collapse group"}
          onClick={() => toggleCollapsed(group.id)}
          className="rounded px-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          {group.collapsed ? "▸" : "▾"}
        </button>

        {/* AND / OR toggle */}
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-xs font-semibold dark:border-slate-700">
          {(["AND", "OR"] as Combinator[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCombinator(group.id, c)}
              className={cn(
                "px-2.5 py-1 transition-colors",
                group.combinator === c
                  ? cn(COMBINATOR_COLORS[c], "text-white")
                  : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => toggleNot(group.id)}
          className={cn(
            "rounded-md border px-2 py-1 text-xs font-semibold transition-colors",
            group.not
              ? "border-rose-500 bg-rose-500 text-white"
              : "border-slate-300 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          )}
        >
          NOT
        </button>

        <span className="text-xs text-slate-400">{group.children.length} item(s)</span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => addRule(group.id)}
            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
          >
            + Rule
          </button>
          <button
            type="button"
            onClick={() => addGroup(group.id)}
            className="rounded-md border border-indigo-600 px-2.5 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950"
          >
            + Group
          </button>
          {!isRoot && (
            <button
              type="button"
              aria-label="Remove group"
              onClick={() => removeNodeById(group.id)}
              className="rounded-md px-2 py-1 text-xs text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {groupError && <p className="mb-2 pl-1 text-xs text-rose-600">{groupError}</p>}

      {!group.collapsed && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={group.children.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {group.children.length === 0 && (
                <p className="rounded-md border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400 dark:border-slate-700">
                  Empty group — add a rule or nested group.
                </p>
              )}
              {group.children.map((child) => (
                <SortableChild
                  key={child.id}
                  node={child}
                  source={source}
                  issues={issues}
                  depth={depth}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export const GroupNode = memo(GroupNodeBase);
