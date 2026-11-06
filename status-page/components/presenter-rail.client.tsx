"use client";

/**
 * A fixed scrollspy rail (lg+ only) mirroring the 3-minute script's five beats. Highlights the
 * current beat in teal as it scrolls into view, each dot is a jump link, and j/k step to the
 * next/previous beat -- a presenter can drive the whole pitch without hunting for a scrollbar.
 * Hidden entirely below lg (the in-flow section kickers already carry the same timestamps there).
 */
import { useEffect, useRef, useState } from "react";

const BEATS = [
  { id: "beat-hook", time: "00:00" },
  { id: "beat-proof", time: "00:25" },
  { id: "beat-untouchable", time: "01:10" },
  { id: "beat-why-now", time: "02:10" },
  { id: "beat-close", time: "02:45" },
];

export function PresenterRail() {
  const [activeId, setActiveId] = useState(BEATS[0].id);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    // Active beat = the last one whose header has scrolled above 35% of the viewport. Computed
    // from positions on scroll (rAF-throttled) rather than per-header intersection events, so a
    // fast jump past a whole section still lands on the right beat instead of a stale one.
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let index = 0;
      BEATS.forEach((b, i) => {
        const el = document.getElementById(b.id);
        if (el && el.getBoundingClientRect().top <= line) index = i;
      });
      activeIndexRef.current = index;
      setActiveId(BEATS[index].id);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key !== "j" && e.key !== "k") return;
      const delta = e.key === "j" ? 1 : -1;
      const next = Math.min(Math.max(activeIndexRef.current + delta, 0), BEATS.length - 1);
      document.getElementById(BEATS[next].id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav className="presenter-rail flex-col gap-4" aria-label="Pitch beats">
      {BEATS.map((beat) => {
        const active = beat.id === activeId;
        return (
          <a
            key={beat.id}
            href={`#${beat.id}`}
            aria-current={active ? "true" : undefined}
            className="group flex items-center gap-2"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 [transition-timing-function:var(--ease)] ${
                active ? "bg-accent" : "bg-text-tertiary"
              }`}
            />
            <span
              className={`label text-[10px] transition-colors duration-300 [transition-timing-function:var(--ease)] ${
                active ? "text-accent" : "text-text-tertiary group-hover:text-text-secondary"
              }`}
            >
              {beat.time}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
