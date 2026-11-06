"use client";

/**
 * Toggles data-theme on <html> between "light" and "dark", overriding prefers-color-scheme (the
 * CSS in globals.css already supports both: :root[data-theme] takes precedence over the media
 * query). Remembered per-viewer via localStorage -- a convenience the page never reads back as
 * data, so it degrades silently if storage is blocked (private window, etc).
 */
import { useEffect } from "react";

function effectiveTheme(): "light" | "dark" {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem("shankh-theme");
      if (stored === "light" || stored === "dark") document.documentElement.setAttribute("data-theme", stored);
    } catch {
      // storage blocked -- falls back to prefers-color-scheme, which already works
    }
  }, []);

  const toggle = () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("shankh-theme", next);
    } catch {
      // see above
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      className="rounded-full border border-border p-1.5 text-text-secondary transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 2a6 6 0 0 1 0 12Z" fill="currentColor" />
      </svg>
    </button>
  );
}
