"use client";

import { useEffect, useState } from "react";
import { Monitor, MoveHorizontal, X } from "lucide-react";

/**
 * VQueryBuilder is a desktop-class tool (draggable canvas, multi-pane layout).
 * On small viewports we show a friendly notice recommending a desktop, while
 * still letting determined users continue into a gracefully-stacked layout.
 */
export function MobileGate() {
  const [isSmall, setIsSmall] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsSmall(mq.matches);
    update();
    mq.addEventListener("change", update);
    try {
      if (sessionStorage.getItem("vqb-mobile-dismissed") === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!isSmall || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem("vqb-mobile-dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-5 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300">
          <Monitor size={28} />
        </div>
        <h2 className="text-lg font-bold">Best on a larger screen</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          VQueryBuilder is a visual database workbench — it uses a draggable canvas, join diagrams,
          and several side-by-side panels that need room to breathe. For the full experience, open it
          on a tablet or desktop in landscape.
        </p>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <MoveHorizontal size={14} /> Rotating your phone to landscape also helps.
        </p>
        <button
          onClick={dismiss}
          className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          Continue on mobile anyway
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
