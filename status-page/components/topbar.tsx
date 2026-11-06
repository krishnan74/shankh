import { ThemeToggle } from "./theme-toggle.client";

function ConchMark() {
  // A simple spiral/ripple glyph -- the brand mark, pure SVG, no image request.
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21c-4 0-7-2.5-7-6.5S8 6 12 6s6 3 6 6-2.5 5-5.5 5-4.5-1.8-4.5-4 1.5-3.5 3.5-3.5 2.5 1.2 2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TopBar({ blockNumber }: { blockNumber: bigint | null }) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
      <div className="flex items-center gap-2">
        <span className="text-accent">
          <ConchMark />
        </span>
        <span className="font-display text-sm font-bold italic">Shankh</span>
      </div>
      <div className="flex items-center gap-4">
        {blockNumber !== null ? (
          <span className="label hidden text-[10px] text-text-secondary sm:inline-flex sm:items-center sm:gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            LIVE · Sepolia #{blockNumber.toString()}
          </span>
        ) : (
          <span className="label hidden text-[10px] text-text-tertiary sm:inline-flex sm:items-center sm:gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
            OFFLINE · couldn&rsquo;t reach Sepolia
          </span>
        )}
        <a
          href="https://github.com/krishnan74/shankh"
          className="label text-[10px] text-text-secondary transition-colors hover:text-accent"
        >
          GitHub
        </a>
        <ThemeToggle />
      </div>
      </div>
    </div>
  );
}
