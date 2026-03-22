import React from "react";

/**
 * Full-screen overlay shown while the backend generates slides (streaming or mock).
 */
export default function GeneratingSlidesModal({ open }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generating-slides-title"
      aria-busy="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-slate-200/80">
        <div className="flex flex-col items-center gap-5 text-center">
          <div
            className="h-14 w-14 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin"
            role="status"
            aria-hidden
          />
          <div>
            <h2 id="generating-slides-title" className="text-lg font-semibold text-slate-900">
              Generating your slides
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This can take a minute. You can keep this tab open—we&apos;ll show your deck here when it&apos;s ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
