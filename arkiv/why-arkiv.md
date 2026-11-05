# Why Arkiv — Shankh

**If you swapped Arkiv for Postgres or any other database, what would your users lose?** The October 2026 LiteLLM attacker deleted GitHub Action workflow records to limit what investigators could see (project-overview.md §2.1, stage 3). A `shankh.report` owned by the reporter's own wallet can't be deleted or edited by Shankh, by the package maintainer, or by anyone who compromises the publisher's infrastructure — only the reporter. A report in a server Shankh controls would be exactly the kind of single point of failure the project exists to avoid (plan-2.md "Survive a compromised publisher").

**What did you keep off Arkiv, and why?** The local inventory and exposure snapshot (what's installed, what credentials it could reach) never leaves the device — see plan-2.md "Privacy". Arkiv holds only evidence that's meant to be shared: the report itself, not the victim's exposure.
