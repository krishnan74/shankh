"use client";

/**
 * Fades + lifts a section in once it's scrolled into view. The actual motion lives in
 * globals.css ([data-reveal] / [data-reveal="in"]) gated behind prefers-reduced-motion: no-preference
 * -- this component only ever toggles a data attribute, never inline styles, so a user who's
 * asked for reduced motion sees the content immediately with no transition at all.
 */
import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay for siblings revealing as a cascade (landing-page-playbook.md #5). */
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={visible ? "in" : undefined}
      className={className}
      style={delayMs ? ({ "--reveal-delay": `${delayMs}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
