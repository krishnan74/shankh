"use client";

/**
 * An inline mono chip for addresses/hashes, with a copy button. Long values truncate to
 * `0x12ab…9fe0` visually (full value stays in `title` and gets copied in full) so a 64-char hash
 * never breaks the one-line rhythm of a card -- the truncation is CSS-adjacent display only, the
 * underlying value copied is always the complete real string, never the shortened one.
 */
import { useState } from "react";

function truncateHex(value: string): string {
  if (!value.startsWith("0x") || value.length <= 14) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function Code({ children, copy = true }: { children: string; copy?: boolean }) {
  const [copied, setCopied] = useState(false);
  const display = truncateHex(children);

  if (!copy) {
    return (
      <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-sm break-all dark:bg-white/[.08]" title={children}>
        {display}
      </code>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-sm break-all dark:bg-white/[.08]" title={children}>
        {display}
      </code>
      <button
        type="button"
        aria-label={`Copy ${children}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard API can be unavailable (older browser, blocked permission) -- fail quietly,
            // the value is still fully visible and selectable by hand.
          }
        }}
        className="rounded p-0.5 text-text-tertiary transition-colors hover:text-accent"
      >
        {copied ? (
          <span role="status" aria-live="polite" className="toast-enter label text-[9px] text-accent">
            copied
          </span>
        ) : (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M3 10.5V3a1 1 0 0 1 1-1h7.5" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        )}
      </button>
    </span>
  );
}
