/**
 * The three partner prizes, side by side and equally weighted: what each one does in Shankh, what
 * would break without it, and one live reading that proves it's real. Depth beyond that is
 * proportional to what's built -- ENS gets its own section right after, Arkiv's live feed sits in
 * section 02, and the Ethereum Foundation's CROPS criteria get the letter-by-letter strip below,
 * each letter with an honest status.
 */
import type { RegistryInfo } from "@/lib/registry";
import { Architecture } from "./architecture";
import { Reveal } from "./reveal";
import { Card } from "./ui";

/**
 * True only while the GitHub repo is public AND carries an open-source license -- the "O" in
 * CROPS claims both. Confirmed 2026-11-06: repo public, MIT license at the repo root.
 */
const REPO_IS_PUBLIC_AND_LICENSED = true;

type Status = "live" | "partly" | "next";

function StatusTag({ status }: { status: Status }) {
  const cls = {
    live: "border-accent/50 text-accent",
    partly: "border-amber-500/50 text-amber-700 dark:text-amber-400",
    next: "border-border text-text-secondary",
  }[status];
  const text = { live: "Live", partly: "Partly", next: "Next" }[status];
  return <span className={`label inline-flex w-fit rounded-full border px-2 py-0.5 text-[9px] ${cls}`}>{text}</span>;
}

function LiveChip({ children, ok }: { children: React.ReactNode; ok: boolean }) {
  return (
    <span
      className={`label inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] ${
        ok ? "border-accent/50 text-accent" : "border-border text-text-secondary"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-accent" : "bg-text-tertiary"}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export function Partners({
  pypiRegistry,
  reportCount,
  blockNumber,
  packageCount,
  flaggedCount,
}: {
  pypiRegistry: RegistryInfo | null;
  reportCount: number | null;
  blockNumber: bigint | null;
  packageCount: number | null;
  flaggedCount: number | null;
}) {
  const partners = [
    {
      partner: "ENS",
      prize: "Best Use of ENSv2",
      role: "The switch nobody can seize",
      body: "Every package gets an ENS name. The real maintainer flags bad builds there, from a wallet the attacker never stole — and we locked the name space so even we can't interfere.",
      without: "the alarm would sit on someone's server, and whoever controls that server controls the alarm.",
      chip:
        pypiRegistry === null ? (
          <LiveChip ok={false}>Couldn&rsquo;t check just now</LiveChip>
        ) : (
          <LiveChip ok={pypiRegistry.emancipated}>{pypiRegistry.emancipated ? "Name space locked · read just now" : "Name space not locked"}</LiveChip>
        ),
      link: { href: "#beat-ens", label: "See it up close ↓" },
    },
    {
      partner: "Arkiv",
      prize: "Build on Arkiv",
      role: "The shared evidence",
      body: "When one machine catches a bad package, it signs what it found onto Arkiv. Any other machine can read that alarm and check it for itself — no central feed to trust.",
      without: "every machine would catch the attack alone, or rely on a single feed that could be faked or switched off.",
      chip:
        reportCount === null ? (
          <LiveChip ok={false}>Arkiv unreachable just now</LiveChip>
        ) : (
          <LiveChip ok>
            {reportCount} signed alarm{reportCount === 1 ? "" : "s"} · read just now
          </LiveChip>
        ),
      link: { href: "#beat-solution", label: "See the live alarms ↑" },
    },
    {
      partner: "Ethereum Foundation",
      prize: "Best CROPS App",
      role: "No one in the middle",
      body: "Shankh runs on your own machine and talks straight to public networks — PyPI, Sepolia, Arkiv. There's no Shankh server to take down, pressure or hack. This page is only a window: switch it off and the check still runs.",
      without: "Shankh would be one more service you'd have to trust.",
      chip:
        blockNumber === null ? (
          <LiveChip ok={false}>Couldn&rsquo;t reach Sepolia just now</LiveChip>
        ) : (
          <LiveChip ok>Sepolia block #{blockNumber.toString()}</LiveChip>
        ),
      link: { href: "#crops", label: "How it scores on CROPS ↓" },
    },
  ];

  const crops: { letter: string; name: string; body: string; status: Status }[] = [
    {
      letter: "C",
      name: "Censorship-resistant",
      body: "Nobody can delete the alarm — not the hacked publisher, and not us. It lives on ENS and Arkiv, not on a server.",
      status: "live",
    },
    {
      letter: "O",
      name: "Open source",
      body: REPO_IS_PUBLIC_AND_LICENSED
        ? "Every line is public on GitHub under the MIT license — run it yourself, no account needed."
        : "The code goes public on GitHub with an open-source license for judging.",
      status: REPO_IS_PUBLIC_AND_LICENSED ? "live" : "next",
    },
    {
      letter: "P",
      name: "Private",
      body: "What's installed on your machine and which keys you hold stay on it. Only the verdict on a package is published. Private chain reads (Anon-RPC) come next.",
      status: "partly",
    },
    {
      letter: "S",
      name: "Secure",
      body: "Proven, not trusted: packages are rebuilt from source, and on ENS only the maintainer's switch can flag a build. Switching the keys off automatically comes next.",
      status: "partly",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {partners.map((p, i) => (
          <Reveal key={p.partner} delayMs={i * 80}>
            <Card className="flex h-full flex-col gap-4">
              <div className="flex flex-col gap-1">
                <p className="label text-[10px] text-text-secondary">
                  {p.partner} · {p.prize}
                </p>
                <p className="font-display text-2xl leading-tight font-bold tracking-tight lg:min-h-[2.5em]">{p.role}</p>
              </div>
              <p className="text-sm leading-relaxed text-text-secondary">{p.body}</p>
              <p className="text-sm leading-relaxed text-text-secondary">
                <span className="font-medium text-foreground">Without it,</span> {p.without}
              </p>
              <div className="mt-auto flex flex-col gap-3 pt-2">
                {p.chip}
                <a href={p.link.href} className="text-xs text-text-secondary underline decoration-border underline-offset-2 hover:text-accent">
                  {p.link.label}
                </a>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      <Architecture packageCount={packageCount} flaggedCount={flaggedCount} reportCount={reportCount} />

      <div id="crops" className="flex scroll-mt-24 flex-col gap-4">
        <p className="label text-[10px] text-text-secondary">Ethereum Foundation · CROPS, letter by letter</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {crops.map((c) => (
            <div key={c.letter} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl leading-none font-black">{c.letter}</span>
                <StatusTag status={c.status} />
              </div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm leading-relaxed text-text-secondary">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
