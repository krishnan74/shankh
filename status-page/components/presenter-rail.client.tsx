"use client";

/**
 * A fixed rail listing the page's four parts: numbers from 1280px, the active part's name from
 * 1600px -- below those widths the page's left margin is too narrow and it would sit on the
 * content. The current part highlights in teal as you scroll, each one is a jump link, and j/k
 * step between parts. The in-flow section labels carry the same numbering when it's hidden.
 */
import { useEffect, useRef, useState } from "react";

const BEATS = [
  { id: "beat-incident", n: "01", label: "What happened" },
  { id: "beat-solution", n: "02", label: "What Shankh does" },
  { id: "beat-ens", n: "03", label: "Why it can't be silenced" },
  { id: "beat-status", n: "04", label: "Where it stands" },
];

export function PresenterRail() {
  const [activeId, setActiveId] = useState(BEATS[0].id);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    // Active part = the last one whose header has scrolled above 35% of the viewport. Computed
    // from positions on scroll (rAF-throttled), so a fast jump still lands on the right part.
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
    <nav className="presenter-rail flex-col gap-4" aria-label="Page sections">
      {BEATS.map((beat) => {
        const active = beat.id === activeId;
        return (
          <a key={beat.id} href={`#${beat.id}`} aria-current={active ? "true" : undefined} className="group flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300 [transition-timing-function:var(--ease)] ${
                active ? "bg-accent" : "bg-text-tertiary"
              }`}
            />
            <span
              className={`text-[11px] transition-colors duration-300 [transition-timing-function:var(--ease)] ${
                active ? "text-accent" : "text-text-secondary group-hover:text-foreground"
              }`}
            >
              <span className="label mr-1.5 text-[10px]">{beat.n}</span>
              <span className={active ? "sr-only min-[1600px]:not-sr-only" : "sr-only"}>{beat.label}</span>
            </span>
          </a>
        );
      })}
    </nav>
  );
}
