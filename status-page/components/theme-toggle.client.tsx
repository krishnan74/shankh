"use client";

/**
 * Light is the default; this toggles data-theme="dark" on <html> and back. The choice is
 * remembered per visitor in localStorage and re-applied before first paint by the inline script
 * in app/layout.tsx. Storage is a convenience only -- if it's blocked, the page stays light.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (next === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    try {
      localStorage.setItem("shankh-theme", next);
    } catch {
      // storage blocked -- the toggle still works for this visit
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      className="rounded-full border border-border p-1.5 text-text-secondary transition-colors hover:text-accent"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 2a6 6 0 0 1 0 12Z" fill="currentColor" />
      </svg>
    </button>
  );
}
