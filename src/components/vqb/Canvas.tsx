"use client";

import { useCallback, useRef } from "react";
import { GripVertical, KeyRound, Table2, X } from "lucide-react";
import type { CanvasTable, Join } from "@/lib/types";
import type { ResolvedTable } from "@/lib/joins";
import { cn } from "@/lib/cn";
import { useWorkspaceStore } from "@/store/workspaceStore";

const CARD_W = 210;
const HEADER_H = 34;
const ROW_H = 24;

function TableCard({ table }: { table: ResolvedTable }) {
  const moveTable = useWorkspaceStore((s) => s.moveTable);
  const removeTable = useWorkspaceStore((s) => s.removeTable);
  const addColumn = useWorkspaceStore((s) => s.addColumn);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { dx: e.clientX - table.x, dy: e.clientY - table.y };
    },
    [table.x, table.y]
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return;
      moveTable(table.id, Math.max(0, e.clientX - drag.current.dx), Math.max(0, e.clientY - drag.current.dy));
    },
    [moveTable, table.id]
  );
  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  return (
    <div
      className="absolute select-none rounded-md border border-slate-300 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-800"
      style={{ left: table.x, top: table.y, width: CARD_W }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex cursor-grab items-center gap-1.5 rounded-t-md bg-sky-600 px-2 text-white active:cursor-grabbing"
        style={{ height: HEADER_H }}
      >
        <GripVertical size={14} className="opacity-70" />
        <Table2 size={14} />
        <span className="truncate text-sm font-semibold">
          {table.source.name} <span className="opacity-80">{table.alias}</span>
        </span>
        <button onClick={() => removeTable(table.id)} className="ml-auto rounded p-0.5 hover:bg-white/20" aria-label="Remove table from canvas">
          <X size={14} />
        </button>
      </div>
      <ul className="max-h-56 overflow-y-auto py-0.5 thin-scroll">
        {table.source.fields.map((f, i) => (
          <li
            key={f.name}
            onClick={() => addColumn(table.id, f.name)}
            title="Add to SELECT"
            className="flex cursor-pointer items-center gap-1.5 px-2 text-[13px] hover:bg-sky-50 dark:hover:bg-slate-700"
            style={{ height: ROW_H }}
          >
            {i === 0 ? <KeyRound size={12} className="text-amber-500" /> : <span className="w-3" />}
            <span className={cn("truncate", i === 0 && "font-semibold")}>{f.name}</span>
            <span className="ml-auto text-[10px] text-slate-400">{f.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Approximate anchor points for join lines from stored positions. */
function anchors(t: CanvasTable, other: CanvasTable) {
  const leftIsFirst = t.x <= other.x;
  const y = t.y + HEADER_H / 2;
  return {
    x: leftIsFirst ? t.x + CARD_W : t.x,
    y,
  };
}

function JoinLines({ tables, joins }: { tables: ResolvedTable[]; joins: Join[] }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
      {joins.map((j) => {
        const a = tables.find((t) => t.id === j.leftTableId);
        const b = tables.find((t) => t.id === j.rightTableId);
        if (!a || !b) return null;
        const pa = anchors(a, b);
        const pb = anchors(b, a);
        const midX = (pa.x + pb.x) / 2;
        return (
          <g key={j.id}>
            <path
              d={`M ${pa.x} ${pa.y} C ${midX} ${pa.y}, ${midX} ${pb.y}, ${pb.x} ${pb.y}`}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth={2}
            />
            <circle cx={pa.x} cy={pa.y} r={3} fill="#0ea5e9" />
            <circle cx={pb.x} cy={pb.y} r={3} fill="#0ea5e9" />
            <rect x={midX - 16} y={(pa.y + pb.y) / 2 - 9} width={32} height={18} rx={4} fill="#0ea5e9" />
            <text x={midX} y={(pa.y + pb.y) / 2 + 4} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
              {j.type === "INNER" ? "⋈" : j.type[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Canvas({ tables, joins }: { tables: ResolvedTable[]; joins: Join[] }) {
  return (
    <div className="relative h-full w-full overflow-auto bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] [background-size:18px_18px] dark:bg-[radial-gradient(circle,#334155_1px,transparent_1px)]">
      {tables.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          Add a table from the navigator (hover a table → <span className="mx-1 font-semibold">+</span>) to start building.
        </div>
      ) : (
        <>
          <JoinLines tables={tables} joins={joins} />
          {tables.map((t) => (
            <TableCard key={t.id} table={t} />
          ))}
        </>
      )}
    </div>
  );
}
