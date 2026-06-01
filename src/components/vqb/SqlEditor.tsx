"use client";

import { useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";

const KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "INNER", "LEFT", "RIGHT", "FULL",
  "CROSS", "JOIN", "ON", "GROUP", "BY", "ORDER", "ASC", "DESC", "AS", "IN",
  "BETWEEN", "LIKE", "IS", "NULL", "REGEXP", "COUNT", "SUM", "AVG", "MIN", "MAX",
]);

/** Lightweight, dependency-free SQL highlighter. */
function highlight(sql: string) {
  const tokens = sql.split(/(\s+|,|\(|\))/);
  return tokens.map((tok, i) => {
    const upper = tok.toUpperCase();
    if (KEYWORDS.has(upper)) return <span key={i} className="font-semibold text-rose-500 dark:text-rose-400">{tok}</span>;
    if (/^'.*'$/.test(tok)) return <span key={i} className="text-emerald-600 dark:text-emerald-400">{tok}</span>;
    if (/^\d+(\.\d+)?$/.test(tok)) return <span key={i} className="text-amber-600 dark:text-amber-400">{tok}</span>;
    if (tok.startsWith("--")) return <span key={i} className="text-slate-400 italic">{tok}</span>;
    return <span key={i}>{tok}</span>;
  });
}

export function SqlEditor({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="flex h-full flex-col border-l border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Code2 size={14} /> SQL Editor
        </span>
        <button onClick={copy} className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="thin-scroll flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[13px] leading-relaxed">
        <code>{highlight(sql)}</code>
      </pre>
    </div>
  );
}
