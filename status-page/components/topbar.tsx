import Link from "next/link";
import { ThemeToggle } from "./theme-toggle.client";

function ConchMark() {
  // The brand mark: a conch spiral cut into the Ethereum diamond. A 256px transparent PNG
  // (public/logo-mark.png, cropped from the repo-root logo.png) shown at 22px, so it stays sharp
  // on 2x/3x screens. Decorative -- the wordmark next to it carries the name.
  // eslint-disable-next-line @next/next/no-img-element -- a fixed 25 KB asset; next/image adds nothing here
  return <img src="/logo-mark.png" width={22} height={22} alt="" aria-hidden="true" className="block" />;
}

export function TopBar({ blockNumber, current = "home" }: { blockNumber: bigint | null; current?: "home" | "registry" }) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
      <Link href="/" className="flex items-center gap-2" aria-label="Shankh — home">
        <ConchMark />
        <span className="font-display text-sm font-bold italic">Shankh</span>
      </Link>
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
        <Link
          href="/registry"
          aria-current={current === "registry" ? "page" : undefined}
          className={`label text-[10px] transition-colors hover:text-accent ${current === "registry" ? "text-accent" : "text-text-secondary"}`}
        >
          Registry
        </Link>
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
