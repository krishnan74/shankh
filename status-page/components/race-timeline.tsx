/**
 * "Same attack. Two clocks." Two tracks on one 0-5h axis.
 *
 * Top track: the REAL LiteLLM 1.107.0 incident, October 2026 -- historical, and only timestamps
 * verified in plan-2.md's Status table (published 11:39 UTC, PyPI quarantine 13:20, Docker image
 * removed ~14:20, stolen key first observed in use ~4.5h after theft per one Wiz observation).
 * Deliberately NOT included: a precise calendar day or a Docker start time -- neither is in our
 * verified sources, so neither is drawn.
 *
 * Bottom track: a COUNTERFACTUAL -- Shankh didn't exist during this incident, and its watcher and
 * AWS kill aren't built yet. It's labeled as the designed path with an unmeasured "minutes" target,
 * never as something that happened or a measured number.
 */
import { Card } from "./ui";

const HOURS = 5;
const pct = (h: number) => `${(h / HOURS) * 100}%`;

const REAL = [
  { h: 0, label: "11:39 · poisoned update goes live", tone: "neutral" as const },
  { h: 1 + 41 / 60, label: "13:20 · PyPI pulls it", tone: "neutral" as const },
  { h: 2 + 41 / 60, label: "~14:20 · Docker image pulled", tone: "neutral" as const },
  { h: 4.5, label: "~4.5h · a stolen key is used", tone: "attack" as const },
];

const DESIGNED = [
  { h: 0.08, label: "caught by the rebuild" },
  { h: 0.16, label: "alarm raised" },
  { h: 0.24, label: "keys switched off (planned)" },
];

export function RaceTimeline() {
  return (
    <div className="flex flex-col gap-3">
      {/* Visual -- desktop only; the list below carries the same facts for mobile and screen readers. */}
      <div className="hidden sm:block" aria-hidden="true">
        <div className="mb-2 flex justify-between px-5 font-mono text-[10px] text-text-tertiary">
          {Array.from({ length: HOURS + 1 }).map((_, i) => (
            <span key={i}>{i}h</span>
          ))}
        </div>

        <Card className="relative h-28">
          <p className="label absolute top-3 left-5 text-[10px] text-text-tertiary">What actually happened — LiteLLM 1.107.0, October 2026</p>
          <div className="absolute right-5 bottom-8 left-5 h-px">
            <div className="track-draw absolute inset-0 bg-text-tertiary" />
            {REAL.map((p, i) => (
              <div key={p.label} className="absolute -translate-x-1/2" style={{ left: pct(p.h) }}>
                <span className={`block h-2.5 w-2.5 -translate-y-1/2 rounded-full ${p.tone === "attack" ? "bg-red-600 dark:bg-red-500" : "bg-text-secondary"}`} />
                <span
                  className={`absolute top-3 whitespace-nowrap font-mono text-[10px] ${
                    i === 0 ? "left-0" : i === REAL.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2"
                  } ${p.tone === "attack" ? "text-red-700 dark:text-red-400" : "text-text-secondary"}`}
                >
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card tone="inverted" className="relative mt-5 h-28">
          <p className="label absolute top-3 left-5 text-[10px] text-accent">With Shankh — how it is designed to go (not yet measured)</p>
          <div className="absolute right-5 bottom-8 left-5 h-px">
            <div className="track-draw absolute inset-y-0 left-0 bg-accent" style={{ width: pct(0.24) }} />
            {/* the gap: from the designed kill to the real attacker's use */}
            <div
              className="absolute -top-3 h-6 border-x border-dashed border-accent/40 bg-accent/10"
              style={{ left: pct(0.24), width: `calc(${pct(4.5)} - ${pct(0.24)})` }}
            >
              <span className="label absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-accent">hours to spare</span>
            </div>
            {DESIGNED.map((p, i) => (
              <div key={p.label} className="absolute -translate-x-1/2" style={{ left: pct(p.h) }}>
                <span className="block h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-accent" />
                {i === DESIGNED.length - 1 && (
                  <span className="absolute top-3 left-0 whitespace-nowrap font-mono text-[10px] text-background/80">
                    caught → alarm → keys off, within minutes (planned)
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Text equivalent: the visible layout on mobile, screen-reader-only on desktop. */}
      <ol className="flex flex-col gap-2 text-sm sm:sr-only">
        <li className="label text-[10px] text-text-tertiary">What actually happened — LiteLLM 1.107.0, October 2026</li>
        {REAL.map((p) => (
          <li key={p.label} className={`font-mono text-xs ${p.tone === "attack" ? "text-red-700 dark:text-red-400" : "text-text-secondary"}`}>
            {p.label}
          </li>
        ))}
        <li className="label mt-2 text-[10px] text-accent">With Shankh — how it is designed to go (not yet measured)</li>
        {DESIGNED.map((p) => (
          <li key={p.label} className="font-mono text-xs text-accent">
            {p.label}, minutes in
          </li>
        ))}
        <li className="text-xs text-text-secondary">The gap between the keys going off and the attacker using one: hours to spare.</li>
      </ol>

      <p className="text-[11px] text-text-tertiary">
        Historical timestamps: Datadog, Help Net Security, CSA write-ups; stolen-key timing is a single Wiz observation.
      </p>
    </div>
  );
}
