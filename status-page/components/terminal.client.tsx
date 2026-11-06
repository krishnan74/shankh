"use client";

/**
 * A real, previously-run terminal transcript -- always dark in both themes, the universal
 * convention for "this is a command that actually executed." Every line is always rendered (so
 * no layout shift, and no-JS / reduced-motion visitors see the full transcript); only opacity is
 * animated. When the block scrolls into view, lines fade in top to bottom with the shared easing;
 * "replay" runs it again. Under prefers-reduced-motion the replay button isn't offered at all.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type TerminalLine = { prompt?: boolean; text: string; tone?: "default" | "accent" | "muted" };

const TONE_CLASS: Record<string, string> = {
  default: "text-zinc-100",
  accent: "text-emerald-400",
  muted: "text-zinc-400", // zinc-500 measured 4.03:1 on #0b0d0e (Lighthouse) -- below AA
};

const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";
const subscribe = (cb: () => void) => {
  const q = window.matchMedia(MOTION_QUERY);
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};

export function Terminal({ lines, title }: { lines: TerminalLine[]; title: string }) {
  const motionOk = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
  const ref = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [shown, setShown] = useState(lines.length);

  const play = () => {
    timers.current.forEach(clearTimeout);
    setShown(0);
    timers.current = lines.map((_, i) => setTimeout(() => setShown(i + 1), 200 + i * 260));
  };

  useEffect(() => {
    if (!motionOk) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          play();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot observer, play() only touches refs/setters
  }, [motionOk]);

  return (
    <div ref={ref} className="overflow-hidden rounded-xl border border-black/20 bg-[#0b0d0e]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          </div>
          <span className="truncate font-mono text-[11px] text-zinc-400">{title}</span>
        </div>
        {motionOk && (
          <button type="button" onClick={play} className="label shrink-0 text-[9px] text-zinc-400 transition-colors hover:text-emerald-400">
            ↻ replay
          </button>
        )}
      </div>
      <div className="p-4 font-mono text-xs leading-relaxed sm:text-sm">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap break-all transition-opacity duration-300 [transition-timing-function:var(--ease)] ${TONE_CLASS[line.tone ?? "default"]} ${
              i < shown ? "opacity-100" : "opacity-0"
            }`}
          >
            {line.prompt && <span className="text-zinc-500">$ </span>}
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
