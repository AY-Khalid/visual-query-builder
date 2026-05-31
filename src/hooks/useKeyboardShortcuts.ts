"use client";

import { useEffect } from "react";
import { useQueryStore } from "@/store/queryStore";

/**
 * Global keyboard shortcuts:
 *  - Cmd/Ctrl+Z: undo
 *  - Cmd/Ctrl+Shift+Z (or Ctrl+Y): redo
 *  - Cmd/Ctrl+Enter: run query (delegated via callback)
 */
export function useKeyboardShortcuts(onRun?: () => void) {
  const undo = useQueryStore((s) => s.undo);
  const redo = useQueryStore((s) => s.redo);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      } else if (key === "enter" && onRun) {
        e.preventDefault();
        onRun();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, onRun]);
}
