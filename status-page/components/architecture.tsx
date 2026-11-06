/**
 * How the three partners fit together, as one picture: Shankh runs on your machine (the EF/CROPS
 * frame -- no Shankh server anywhere in it), ENS on one side holds what maintainers and reporters
 * publish about themselves, Arkiv on the other carries the alarms machines publish to each other.
 *
 * HTML, not SVG: the diagram has to reflow to a single column at phone width (arrows turn from
 * sideways to downward) and inherit the theme tokens. Every arrow is a real call the code makes
 * today, except the ones drawn dashed and tagged "Next" -- those are planned and say so. The counts
 * are live reads passed in from the page, never constants.
 */
import { Reveal } from "./reveal";

function Tag({ children, next = false }: { children: React.ReactNode; next?: boolean }) {
  return (
    <span
      className={`label inline-flex w-fit rounded-full border px-2 py-0.5 text-[9px] ${
        next ? "border-border text-text-secondary" : "border-accent/50 text-accent"
      }`}
    >
      {children}
    </span>
  );
}

function Node({
  partner,
  title,
  children,
  next = false,
  emphasis = false,
}: {
  partner?: string;
  title: string;
  children?: React.ReactNode;
  next?: boolean;
  emphasis?: boolean;
}) {
  const border = next ? "border-dashed border-text-tertiary/60" : emphasis ? "border-accent/50" : "border-border";
  return (
    <div className={`flex flex-col gap-2 rounded-xl border bg-surface p-4 ${border}`}>
      <div className="flex flex-wrap items-center gap-2">
        {partner ? <Tag>{partner}</Tag> : null}
        {next ? <Tag next>Next</Tag> : null}
      </div>
      <p className="font-medium leading-snug">{title}</p>
      {children ? <div className="flex flex-col gap-1.5 text-sm leading-relaxed text-text-secondary">{children}</div> : null}
    </div>
  );
}

/** One record on a name, in the mono "data" role. */
function Rec({ name, record }: { name: string; record: string }) {
  return (
    <span className="flex flex-col font-mono text-[11px] leading-relaxed">
      <span className="break-words text-foreground">{name}</span>
      <span>↳ {record}</span>
    </span>
  );
}

/**
 * A labelled connector between columns: points sideways from lg up, downward/upward below it, so
 * the single-column mobile layout still reads top to bottom.
 */
function Arrow({ label, dir, next = false }: { label: string; dir: "right" | "left"; next?: boolean }) {
  const wide = dir === "right" ? "→" : "←";
  const narrow = dir === "right" ? "↓" : "↑";
  return (
    <p className={`flex items-center gap-2 text-xs leading-snug ${next ? "text-text-tertiary" : "text-text-secondary"}`}>
      {dir === "left" ? (
        <span aria-hidden="true" className="font-mono text-accent">
          <span className="lg:hidden">{narrow}</span>
          <span className="hidden lg:inline">{wide}</span>
        </span>
      ) : null}
      <span className={next ? "italic" : ""}>{label}</span>
      {dir === "right" ? (
        <span aria-hidden="true" className="font-mono text-accent">
          <span className="lg:hidden">{narrow}</span>
          <span className="hidden lg:inline">{wide}</span>
        </span>
      ) : null}
    </p>
  );
}

function Connector({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-center gap-3 border-l border-dashed border-border py-2 pl-4 lg:border-l-0 lg:py-0 lg:pl-0">
      {children}
    </div>
  );
}

export function Architecture({
  packageCount,
  flaggedCount,
  reportCount,
}: {
  packageCount: number | null;
  flaggedCount: number | null;
  reportCount: number | null;
}) {
  const ensLive =
    packageCount === null ? "Couldn't read ENS just now" : `${packageCount} packages · ${flaggedCount ?? 0} flagged builds · read just now`;
  const arkivLive = reportCount === null ? "Arkiv unreachable just now" : `${reportCount} signed alarms · read just now`;

  return (
    <div id="architecture" className="flex scroll-mt-24 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="label text-[10px] text-text-secondary">How the three fit together</p>
        <p className="max-w-3xl text-sm leading-relaxed text-text-secondary">
          Shankh runs on your own machine. On one side, ENS holds what maintainers and reporters say about themselves. On the other, Arkiv carries
          the alarms machines send each other. Dashed parts aren&rsquo;t built yet.
        </p>
      </div>

      <Reveal>
        {/* The EF frame: everything inside is direct calls to public networks -- no Shankh server. */}
        <div className="rounded-2xl border border-border bg-background p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_6.5rem_1.1fr_6.5rem_1fr] lg:gap-5 xl:grid-cols-[1.25fr_8rem_1.1fr_8rem_1fr]">
            {/* Left: what's published about packages and reporters */}
            <div className="flex flex-col gap-3">
              <Node title="The package's real maintainer">
                <span>Flags a bad build from their own wallet, through the package&rsquo;s KillSwitch.</span>
              </Node>
              <p className="pl-4 font-mono text-xs text-accent" aria-hidden="true">
                ↓ <span className="text-text-secondary">revoke(build)</span>
              </p>
              <Node partner="ENS · Sepolia" title="Names nobody can seize" emphasis>
                <Rec name="<pkg>.pypi.shankh.eth" record="shankh.revoked" />
                <span className="text-xs">bad builds, writable only by that package&rsquo;s KillSwitch</span>
                <Rec name="<name>.reporters.shankh.eth" record="shankh.signer" />
                <span className="text-xs">which wallet a reporter signs with, writable only by them</span>
                <span className="pt-1 text-xs text-accent">{ensLive}</span>
              </Node>
              <Node title="PyPI · the public source code">
                <span>What the package is supposed to contain.</span>
              </Node>
            </div>

            <Connector>
              <Arrow dir="right" label="bad-builds list for every package" />
              <Arrow dir="right" label="which reporters you trust" />
              <Arrow dir="right" label="public source, to rebuild against" />
            </Connector>

            {/* Center: Shankh itself, on your machine */}
            <div className="tone-inverted flex flex-col gap-3 self-center rounded-2xl border border-accent/40 bg-foreground p-4 text-background sm:p-5">
              <div className="flex flex-col gap-1">
                <span className="label text-[9px] text-accent">Your machine · runs locally</span>
                <p className="font-display text-xl leading-tight font-bold">Shankh</p>
              </div>
              {[
                { step: "1", title: "Check", body: "Rebuild each package from its public source and compare, file by file.", cmd: "shankh verify" },
                {
                  step: "2",
                  title: "Sweep",
                  body: "Compare everything installed against every flagged build on ENS, and every trusted alarm on Arkiv, re-checked here.",
                  cmd: "shankh scan --trust",
                },
              ].map((s) => (
                <div key={s.step} className="flex flex-col gap-1 rounded-xl border border-background/15 p-3">
                  <p className="text-sm font-medium">
                    <span className="font-mono text-accent">{s.step}</span> {s.title}
                  </p>
                  <p className="text-xs leading-relaxed opacity-70">{s.body}</p>
                  <p className="font-mono text-[11px] text-accent">{s.cmd}</p>
                </div>
              ))}
              <div className="flex flex-col gap-1 rounded-xl border border-background/15 p-3">
                <p className="text-sm font-medium">
                  <span className="font-mono text-accent">3</span> Act
                </p>
                <p className="text-xs leading-relaxed opacity-70">Switch off the AWS keys registered with Shankh: quarantined, then deactivated.</p>
                <p className="font-mono text-[11px] text-accent">shankh.kill.respond()</p>
              </div>
            </div>

            <Connector>
              <Arrow dir="right" label="signs what it found" />
              <Arrow dir="left" label="alarms from reporters you trust" />
            </Connector>

            {/* Right: the shared evidence and everyone else */}
            <div className="flex flex-col gap-3">
              <Node partner="Arkiv" title="Signed alarms anyone can read" emphasis>
                <span className="font-mono text-[11px] text-foreground">shankh.report</span>
                <span className="text-xs">package, version, exact build, what was wrong — signed by whoever found it, recorded by Arkiv.</span>
                <span className="pt-1 text-xs text-accent">{arkivLive}</span>
              </Node>
              <p className="pl-4 font-mono text-xs text-accent" aria-hidden="true">
                ↕ <span className="text-text-secondary">read by signer, never by package</span>
              </p>
              <Node title="Every other machine running Shankh">
                <span>Picks up the alarm in seconds, checks it for itself, and only then acts.</span>
              </Node>
            </div>
          </div>

          {/* The EF frame's caption, along the bottom edge */}
          <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex flex-wrap items-center gap-2 text-xs leading-relaxed text-text-secondary">
              <Tag>Ethereum Foundation · CROPS</Tag>
              Every arrow is a direct call to a public network. There&rsquo;s no Shankh server in the picture to hack or switch off.
            </p>
            <p className="flex shrink-0 items-center gap-2 text-xs whitespace-nowrap text-text-tertiary">
              <Tag next>Next</Tag> private chain reads (Anon-RPC)
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
