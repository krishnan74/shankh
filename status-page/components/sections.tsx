/**
 * The page's story, in the same order as the pitch: what happened (the incident) -> what Shankh
 * does (the solution) -> why the alarm can't be silenced (ENS) -> where it stands. Plain language
 * first; technical evidence (raw errors, addresses, hashes) sits one click away so a first-time
 * visitor can follow the page in one scroll. Anything live arrives as props from app/page.tsx --
 * nothing here invents a value, and nothing claims an unbuilt step as working.
 */
import type { Report } from "@/lib/arkiv";
import { ConchRipple, nodeField } from "./conch-ripple";
import { KeyCard } from "./key-card";
import { RaceTimeline } from "./race-timeline";
import { Reveal } from "./reveal";
import { Card, Eyebrow, SectionHeader } from "./ui";

export function Hero({
  reports,
  reportCount,
  revokedCount,
  emancipated,
}: {
  /** null = Arkiv couldn't be reached; [] = reachable but no reports yet. */
  reports: Report[] | null;
  reportCount: number | null;
  revokedCount: number | null;
  emancipated: boolean | null;
}) {
  return (
    <header className="flex flex-col gap-16 sm:gap-20">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-7">
          <Eyebrow>ETHGlobal Mumbai 2026</Eyebrow>
          <h1 className="font-display text-[clamp(2.5rem,5.2vw,4.25rem)] leading-[1.0] font-black tracking-[-0.02em] text-balance">
            Stolen keys that <em className="font-black italic">switch themselves off.</em>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-text-secondary">
            When a software package you installed turns out to be hacked, Shankh proves it and raises an alarm the attacker can&rsquo;t silence. The goal: the cloud keys it could reach get shut off before anyone uses them.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="#beat-incident"
              className="pulse rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-contrast transition-transform duration-300 [transition-timing-function:var(--ease)] hover:scale-[1.03]"
            >
              See how it works
            </a>
            <a
              href="https://github.com/krishnan74/shankh"
              className="text-sm font-medium text-text-secondary underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
            >
              Read the code ↗
            </a>
          </div>
        </div>

        {/* isolate: gives the ripple's -z-10 a stacking context of its own, so it sits behind the
            key card instead of behind the band's background (where it would vanish). */}
        <Reveal className="relative isolate">
          <ConchRipple className="pointer-events-none absolute -inset-16 -z-10 h-[calc(100%+8rem)] w-[calc(100%+8rem)] opacity-70" rings={5} />
          <KeyCard reports={reports} />
        </Reveal>
      </div>

      {/* Live right now: three plain facts, each read on this request. Fixed-width slots so nothing shifts. */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-border bg-surface px-6 py-4 text-sm text-text-secondary">
        <span className="label text-[10px] text-accent">Live right now</span>
        <span className="min-w-[9rem]">
          {reportCount === null ? <span className="text-text-tertiary">Arkiv unreachable</span> : <><strong className="text-foreground">{reportCount}</strong> alarm{reportCount === 1 ? "" : "s"} on Arkiv</>}
        </span>
        <span className="min-w-[11rem]">
          {revokedCount === null ? <span className="text-text-tertiary">ENS unreachable</span> : <><strong className="text-foreground">{revokedCount}</strong> build{revokedCount === 1 ? "" : "s"} flagged on ENS</>}
        </span>
        <span className="min-w-[10rem]">
          {emancipated === null ? (
            <span className="text-text-tertiary">Sepolia unreachable</span>
          ) : emancipated ? (
            <>Namespace <strong className="text-foreground">locked</strong></>
          ) : (
            <span className="text-red-700 dark:text-red-400">Namespace NOT locked</span>
          )}
        </span>
      </div>
    </header>
  );
}

/** 01 -- the incident, told plainly, then shown as two clocks. */
export function Incident() {
  return (
    <>
      <SectionHeader
        id="beat-incident"
        kicker="01 · What happened"
        headline="October 2026: a popular AI package got hacked."
        lede={
          <>
            LiteLLM — used by AI apps everywhere — shipped a poisoned update. For about two hours, anyone who installed it had their cloud keys quietly copied. A stolen key was first used roughly 4.5 hours later, and nothing stopped it. <span className="text-text-secondary/80">(It had happened to the same package in March, too.)</span>
          </>
        }
      />
      <Reveal>
        <RaceTimeline />
      </Reveal>
      <p className="max-w-3xl border-l-2 border-red-600/60 pl-6 font-display text-2xl leading-snug italic text-balance sm:text-3xl dark:border-red-500/60">
        <span className="block">Keys that leak in public get shut off in seconds.</span>
        <span className="block text-red-700 dark:text-red-400">Keys stolen by malware get nothing.</span>
      </p>
    </>
  );
}

/** 02 -- what Shankh does, as three plain steps with an honest live/next tag on each. */
export function SolutionSteps() {
  const steps = [
    {
      n: "1",
      title: "Check",
      body: "Rebuild the package from its public source code and spot any file that shouldn't be there.",
      live: true,
    },
    {
      n: "2",
      title: "Raise the alarm",
      body: "Post a signed alert to Arkiv, and let the real maintainer flag the bad build on ENS. Every other machine can read both.",
      live: true,
    },
    {
      n: "3",
      title: "Shut the keys off",
      body: "Switch off the cloud keys that package could reach — switched off, not deleted, so a false alarm can be undone.",
      live: false,
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {steps.map((s, i) => (
        <Reveal key={s.n} delayMs={i * 80}>
          <Card className="flex h-full flex-col gap-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-4xl leading-none font-black">{s.n}</span>
              <span className={`label rounded-full border px-2 py-0.5 text-[9px] ${s.live ? "border-accent/50 text-accent" : "border-border text-text-secondary"}`}>
                {s.live ? "Live" : "Next"}
              </span>
            </div>
            <p className="font-medium">{s.title}</p>
            <p className="text-sm leading-relaxed text-text-secondary">{s.body}</p>
          </Card>
        </Reveal>
      ))}
    </div>
  );
}

/** 04 -- where it stands: what's real today, what's next, and the conch. */
export function StatusClose() {
  const live = [
    "Catches a real malicious package by rebuilding it from source",
    "Signs the alarm onto Arkiv for every other machine",
    "Reads the maintainer's ENS kill switch, and treats a flagged build as critical",
    "ENS namespace we provably can't take back",
  ];
  const next = [
    "Switching the AWS keys off automatically",
    "An always-on watcher, so checks run without anyone typing a command",
    "Acting on other people's alarms after re-checking them locally",
  ];
  return (
    <Reveal>
      <Card tone="inverted" roomy className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <p className="label text-xs text-accent">05 · Where it stands</p>
            <p className="font-display text-4xl leading-[1.02] font-black tracking-[-0.02em] sm:text-5xl">One catches it. Everyone is saved.</p>
            <p className="text-lg text-balance text-background/70">What you just saw is real. Here&rsquo;s what&rsquo;s live, and what&rsquo;s next.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <p className="label mb-3 text-[10px] text-accent">Live today</p>
              <ul className="flex flex-col gap-2.5 text-sm text-background/80">
                {live.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="text-accent" aria-hidden="true">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label mb-3 text-[10px] text-background/70">Next</p>
              <ul className="flex flex-col gap-2.5 text-sm text-background/80">
                {next.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="text-background/50" aria-hidden="true">○</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <ConchRipple className="mx-auto h-56 w-56 sm:h-64 sm:w-64" rings={4} nodes={nodeField(18)} protectedNodes />
      </Card>
    </Reveal>
  );
}

/** Progressive-disclosure detail: the pipeline, with an honest built/not-yet tag per step. */
export function Stepper() {
  const steps = [
    { n: "01", title: "Notice", body: "Watch installs; map which credentials each package could reach.", built: false },
    { n: "02", title: "Verify", body: "Rebuild from the public sdist, diff file-by-file against what's installed.", built: true },
    { n: "03", title: "Prove", body: "Fold in the maintainer's ENS revocation; a revoked artifact is critical regardless of the diff.", built: true },
    { n: "04", title: "Kill", body: "Quarantine, then deactivate the reachable AWS key. Deactivate, never delete.", built: false },
    { n: "05", title: "Report", body: "Sign the result to Arkiv so every other machine can check it.", built: true },
  ];
  return (
    <ol className="flex flex-col">
      {steps.map((s) => (
        <li key={s.n} className="flex gap-4 border-l border-border py-2 pl-4">
          <span className="label mt-0.5 text-[10px] text-text-tertiary">{s.n}</span>
          <div className="flex-1">
            <p className="flex items-center gap-2 font-medium text-foreground">
              {s.title}
              <span className={`label text-[9px] ${s.built ? "text-accent" : "text-text-tertiary"}`}>{s.built ? "built" : "not yet"}</span>
            </p>
            <p>{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-2 py-12 text-xs text-text-secondary">
      <p>
        Demo runs on Sepolia and the Arkiv testnet against a harmless replay of the attack. No real malware is published.
      </p>
      <p className="flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-accent">
          <path d="M12 21c-4 0-7-2.5-7-6.5S8 6 12 6s6 3 6 6-2.5 5-5.5 5-4.5-1.8-4.5-4 1.5-3.5 3.5-3.5 2.5 1.2 2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <a href="https://github.com/krishnan74/shankh" className="underline underline-offset-2 hover:text-foreground">
          github.com/krishnan74/shankh
        </a>
      </p>
    </footer>
  );
}
