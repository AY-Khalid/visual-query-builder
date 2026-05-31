"use client";

import { useState } from "react";

export function SqlPreview({ sql, valid }: { sql: string; valid: boolean }) {
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
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Live SQL Preview
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-bold " +
              (valid
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300")
            }
          >
            {valid ? "VALID" : "INVALID"}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="thin-scroll overflow-x-auto p-3 text-sm leading-relaxed text-indigo-700 dark:text-indigo-300">
        <code>{sql}</code>
      </pre>
    </div>
  );
}
