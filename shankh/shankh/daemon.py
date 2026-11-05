"""shankhd — the watcher daemon.

Loop: inventory what's installed and what it can reach (shankh.inventory) →
watch for signals that a version is malicious (shankh.signals) →
on an automatic-kill signal, re-verify locally (shankh.verify) → kill (shankh.kill).

Not wired up yet — see docs/plan.md Status table.
"""


def main() -> None:
    raise NotImplementedError("shankhd watcher loop not wired up yet — see docs/plan.md Status table")


if __name__ == "__main__":
    main()
