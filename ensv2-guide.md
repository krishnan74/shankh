# ENSv2 — everything Claude Code needs to read before implementing on it

Consolidated from two prior ENSv2 projects (ENS Drive / Cascade, ETHGlobal Tokyo 2026; Perjury, ETHOnline 2026). Both central claims depended on ENSv2's Enhanced Access Control (EAC), so this is verified on-chain, not read off a doc. Read this whole file before writing any ENSv2 code.

---

## 0. First, before anything else: addresses do not carry over

Every address from a prior project came from an **event-specific ENSv2 beta deployment on Sepolia**, separate from production ENS and from any other event's beta. A new project has its own deployment, or is on production ENSv2. Get the current addresses from the event's ENS channel / deployment page, or from the production ENSv2 docs, and **verify them behaviourally before building anything on top**:

- Check each address actually has code.
- Check the registrar answers `isAvailable`.
- Check the fee token reports the expected symbol and decimals.
- Probe a read that must return non-zero (e.g. `getResolver(label)` for a name you know exists), rather than trusting that an address with bytecode is the right one. An address can have code and look plausible while simply not holding what you think it holds.

**viem and ethers ship a built-in Universal Resolver address that may point at the wrong deployment.** Override it on the chain object explicitly:

```ts
export function withCorrectResolver<T extends { contracts?: Record<string, unknown> }>(chain: T, UNIVERSAL_RESOLVER: `0x${string}`): T {
  return { ...chain, contracts: { ...chain.contracts,
    ensUniversalResolver: { address: UNIVERSAL_RESOLVER, blockCreated: 0 } } };
}
```

---

## 1. The mental model: a registry per name

ENS v1 had one registry contract holding every name. In **ENSv2 the tree of names is a tree of registry contracts**: each name can point to its own registry, which holds that name's children.

```
root registry
 └─ "eth"        → .eth registry (ENS's)
     └─ "yourname"   → your registry (a stock PermissionedRegistry, or a subclass)
         └─ "child"      → that name's registry
             ├─ "grandchild-a"
             └─ "grandchild-b"
```

To find `grandchild-a.child.yourname.eth` you walk: .eth registry → `getSubregistry("yourname")` → your registry → `getSubregistry("child")` → child's registry → the entry `grandchild-a`.

Why this matters: **every registry is its own contract with its own permission table.** A permission granted in one registry means nothing in another.

---

## 2. Labels and the three IDs from one label

A **label** is one piece of a name: `"vault"`. Contracts key on the **labelhash**, `uint256(keccak256("vault"))`.

ENSv2 derives **three IDs from the same labelhash** by overwriting its **lowest 32 bits** with a version number:

| ID | Low 32 bits | Changes when | Used for |
|---|---|---|---|
| **labelhash** | whatever keccak gave | never | the key in the registry's storage |
| **token ID** | `tokenVersionId` | any role grant/revoke on the name, unregister | the ERC-1155 token |
| **resource** | `eacVersionId` (+1 if expired) | unregister / re-register, expiry | the permission scope (EAC) |

Public functions accept **any of the three** (an `anyId`) — they strip the version to find the entry.

Two consequences:
- **Token IDs change a lot.** Granting someone a role burns the token and mints a new ID (`TokenRegenerated`) — so you can't sell a name and revoke a role in the same breath to trick a buyer.
- **The resource changes only on re-issue or expiry.** New resource = a fresh, empty permission table. **Re-issuing a name wipes every permission on it.** An expired name's resource is `eacVersionId + 1`, which has no grants, so every grant on an expired name reads as 0 — this is what actually ends inheritance/validity on expiry, not any extra check you might write.

---

## 3. `PermissionedRegistry` — what a registry stores

Each **entry** (one label) holds: **owner** (an ERC-1155 token, supply 1), **expiry** (timestamp; at/after it the name is `AVAILABLE`), **subregistry** (registry holding this name's children, if any), **resolver** (contract holding this name's records), and the two version counters above.

The registry also stores its own **parent**: `setParent(parentRegistry, label)` / `getParent()` — "I hold the children of `label` in `parentRegistry`." This is just a claim; nothing forces the parent to agree with it. Setting it needs a root role (`ROLE_SET_PARENT`).

Main functions:

| Function | Needs the role | Does |
|---|---|---|
| `register(label, owner, subregistry, resolver, roleBitmap, expiry)` | `ROLE_REGISTRAR` on root | creates an entry, mints the token, gives `owner` the roles in `roleBitmap` |
| `setSubregistry(anyId, registry)` | `ROLE_SET_SUBREGISTRY` on the name | points the name's children somewhere |
| `setResolver(anyId, resolver)` | `ROLE_SET_RESOLVER` on the name | points the name's records somewhere |
| `renew(anyId, expiry)` | `ROLE_RENEW` | extends expiry |
| `unregister(anyId)` | `ROLE_UNREGISTER` | burns the token, bumps both versions |
| `grantRoles` / `revokeRoles` | the matching **admin** role | changes permissions |
| `getSubregistry(label)`, `getResolver(label)` | — | return 0 if the name is expired |

**Read from a contract without the CCIP hop only when you deployed the resolver yourself** and know its interface — otherwise go through the Universal Resolver (section 7), never your own hardcoded reader, or you risk "resolving" against a deployment that knows nothing about the name (see section 8).

---

## 4. Enhanced Access Control (EAC) — the permission system

Every registry (and resolver) inherits `EnhancedAccessControl`. It is a table: `roles[resource][account] = a 256-bit bitmap`.

**Resources are scopes, and are `uint256`, not `bytes32`.** Each name has one resource ID (section 2). There's also `ROOT_RESOURCE = 0`, meaning "the whole registry" — holding a role on root means you hold it on every name in that registry. A check is always **root ∪ the name**.

`IEnhancedAccessControl` types every resource as `uint256` even when it's really a keccak hash shoved into that type. The same 32 bytes encode identically but produce a **different function selector** as `bytes32` vs `uint256` — a `bytes32` call reverts with empty data, which reads as "the role is absent." **A permission check that can't distinguish "absent" from "you called the wrong function" is not a check** — this has silently passed a proof script for days in a prior project. Always confirm your ABI types the argument as `uint256`.

**Roles as a bitmap.** Each role gets one nybble (4 bits) of the 256-bit number. Low 128 bits = **regular roles**; high 128 bits = their **admin** twins (`role << 128`). Holding the admin role is what lets you grant/revoke that role to someone else — **you can only grant what you hold the admin for**.

**Admin bits on a name only at registration.** `grantRoles` on a name resource can only hand out regular roles. Admin bits on a name come only from `register`. Root is different: root admins can grant root admin roles.

**`grantRoles`/`revokeRoles`/`hasRoles` revert for the root resource** — use `grantRootRoles` / `revokeRootRoles` / `hasRootRoles` instead. A root grant satisfies `hasRoles` on every child resource; revoking a resource-scoped grant does not reduce what a root holder can do.

**Counts, not identities.** Each nybble doubles as a counter of how many accounts hold that role on that resource (max 15). You can ask *how many* (`roleCount`, `getAssigneeCount`) but there is **no way to list holders on-chain.** "Who holds role X on this resource" is not answerable on-chain — design around that, don't try to work around it.

**`hasRoles` takes an `anyId`** (any of the three IDs from section 2) and converts it to a resource internally. Inside a subclass, the virtual functions `_checkRoles`/`_getRoles` receive a **resource** directly, not an anyId. `super._getRoles` is the native, non-overridden view.

**`try/catch` does not catch undecodable return data.** If an external callee (e.g. a team/membership contract someone else controls) returns malformed or wrong-length data, the caller reverts regardless of `try/catch` — it only catches reverts, not decode failures. For any call to an untrusted contract, use a low-level `staticcall` and check the return length/shape yourself before decoding.

---

## 5. Resolver roles are a second, independent permission world

| | Registry roles | Resolver roles |
|---|---|---|
| Granted by | `register(...)` with `roleBitmap` | The resolver's own grant mechanism (e.g. `VerifiableFactory`, at deployment) as `(account, roleBitmap)` pairs |
| Govern | Who owns/renews/repoints a name | Who may write which records |
| Derived from name ownership? | Yes | **No** |

**Registering a name grants registry roles only — nothing on any resolver.** Don't design a step to "revoke the owner's ability to write records" — there's nothing to revoke; they never had it.

**Resolver resources derive from the setter argument alone — names play no part.** For a text record, `resource = keccak256(bytes(key))`. A grant of `SET_TEXT` for key `com.example.score` on a shared resolver authorises that key **for every name that resolver serves.** If you need per-subject isolation, you need a resolver per subject.

**The bypass that makes a careful resolver permission model decorative: never grant a subname holder `SET_RESOLVER` (a registry role) unless you mean it.** A holder with it repoints the name at a resolver *they* control and writes whatever they like — every per-key restriction you built on your own resolver becomes irrelevant. This is easy to miss because you spend your design time in the resolver world while the bypass lives in the registry world. Write your forbidden-roles list as a constant and assert it against the live chain in a script, not just a unit test.

### Recipe for a resolver that only one contract can write

Grants supplied at resolver deployment land on the **root resource**, so a writer granted `SET_TEXT` at init can write *every* text key. Narrowing is a separate, post-deployment step:

1. Deploy the resolver through the factory, taking `SET_TEXT | SET_TEXT_ADMIN` **for yourself**.
2. One `multicall` of `grantSetterRoles(setter, writerContract)` per key you want to scope — the "setter" argument is encoded calldata for the setter function; the resolver reads only the **selector and the key** from it, so name/value are placeholders:
   ```ts
   export function setTextSetter(key: string): Hex {
     return encodeFunctionData({ abi: RESOLVER_ABI, functionName: "setText", args: ["0x00", key, ""] });
   }
   ```
3. `revokeRootRoles(SET_TEXT_ADMIN, you)` — and `revokeRootRoles(SET_TEXT, you)` too, if you shouldn't be able to write either.

**One-way door:** a role not taken at resolver deployment can never be acquired later — take every role you might conceivably need at deployment. `revokeSetterRoles` has no working inverse once the admin role is given up, so the narrowing step is deliberately irreversible — get the key list right first.

**Circularity:** the resolver needs the writer contract's address, and the writer needs the resolver's. Break it by granting yourself `SET_TEXT | SET_TEXT_ADMIN` at deployment, deploying the writer, then granting it and revoking your own access.

---

## 6. The read/write asymmetry on a Permissioned Resolver

- **Writes:** `setText(bytes dnsName, string key, string value)` — DNS wire format.
- **Reads:** ENSIP-10 only — `resolve(bytes dnsName, bytes data)` with the inner call ABI-encoded. **`text(bytes32,string)` and `text(bytes,string)` both REVERT** on a factory-deployed resolver.

A direct `text()` call compiles fine, passes unit tests against a naive mock, and reverts on-chain. **Make your mock revert on `text()` too, so it matches production**, and fix reader and writer for this in the same commit — fixing one while leaving the other is how this bug ships.

```solidity
bytes memory inner = abi.encodeWithSignature("text(bytes32,string)", node, KEY);
(bool ok, bytes memory ret) = address(resolver).staticcall(
    abi.encodeWithSelector(IExtendedResolver.resolve.selector, dnsName, inner)
);
if (!ok || ret.length == 0) return (0, false);          // could not read
bytes memory encoded = abi.decode(ret, (bytes));
if (encoded.length == 0) return (0, true);              // genuinely empty
return (_parse(abi.decode(encoded, (string))), true);
```

**Store both name forms per subject.** Writes need DNS encoding, reads need the namehash — don't use one `bytes32` field for both.

```ts
export function dnsEncode(name: string): Hex {
  const out: number[] = [];
  for (const p of name.split(".").filter(Boolean)) {
    const b = new TextEncoder().encode(p);
    if (b.length > 63) throw new Error(`label too long: ${p}`);
    out.push(b.length, ...b);
  }
  out.push(0);
  return `0x${out.map(x => x.toString(16).padStart(2, "0")).join("")}`;
}
```

**Return `(value, readable)`, never a bare value.** A bare return conflates "no record yet" with "could not read" — a resolver outage can read as a standing zero/default, which may be the *permissive* case, silently failing open where the rest of the system fails closed. Parse strictly too: a malformed address record must not decode to `address(0)` and be mistaken for a real one.

---

## 7. Resolving, and what proves a name exists

- The **Universal Resolver** is the single entry point apps should call. It walks the registry tree with `getSubregistry`, finds the resolver with `getResolver`, and asks it for records. **If a name has no resolver, it uses the nearest parent's** (wildcard resolution) — that is inheritance of defaults, not proof a name exists.
- Records (address, text, contenthash…) live in a **resolver**, not the registry. Resolver permissions are keyed by `(namehash, record part)`, scoped to "this name" or "every name in this resolver." A namehash doesn't encode the parent, so there's no "parent" scope in the resolver world.

**Records about a name say nothing about whether the name exists.** A name can exist purely as text-record keys in someone's resolver with no registry entry, no owner, no expiry, no nesting — if the parent has no subregistry and points at a default resolver, resolving the "child" through the Universal Resolver **reverts**, correctly, even though a hardcoded reader that knows the resolver address will happily return data. That's knowing where to look, not resolution.

**Verify every ENS claim through `universalResolver.resolve()`, never through your own reader,** when the question is "does this name really exist / resolve."

Giving a name real children takes three steps:

1. Deploy a **subname registry** for the parent, through the same factory mechanism (e.g. `VerifiableFactory`). One registry per name — derive the salt from the name, not randomly.
2. `setSubregistry(parentTokenId, subregistry)` **and** `setResolver(parentTokenId, yourResolver)` — a child with no resolver of its own falls back to the parent's, and the parent's default resolver holds none of your records.
3. `register(label, owner, subregistry, resolver, roleBitmap, expires)` in the new registry, one per child.

`parentTokenId = BigInt(keccak256(toHex(label)))`.

Take **all roles** on a registry you deploy yourself — granting a role later needs its `_ADMIN` variant, and a tidy-looking bitmap is how you discover an hour in that you can't add a registrar. That root grant is honest (whoever owns a namespace can repoint its resolvers); it is *not* the bitmap a child should get.

---

## 8. Lifecycle — what happens to permissions

| Event | Token ID | Resource | Permissions on the name |
|---|---|---|---|
| grant / revoke a role | new (regenerated) | same | changed as asked |
| transfer the token | same | same | **kept** — third-party grants survive; the new owner can revoke |
| expiry | same | reads as `+1` | all read as 0; `getSubregistry` returns 0; writes revert `LabelExpired` (expiry is checked **before** the role check) |
| unregister, re-register | new | **new** | wiped — a fresh, empty table |
| approve an operator (ERC-1155) | same | same | operator acts with the owner's stored roles |

`PermissionedRegistry._getRoles` already adds the owner's roles for an ERC-1155-approved operator; `super._getRoles` is the un-overridden, native-only version.

---

## 9. How a write is actually checked (memorise the chain)

```
setSubregistry(anyId, X)
 └─ _checkExpiryAndTokenRoles(anyId, ROLE_SET_SUBREGISTRY)
     ├─ expired?  → revert LabelExpired          (expiry checked FIRST)
     └─ _checkRoles(resource, ROLE_SET_SUBREGISTRY, msg.sender)
         └─ hasRoles(...)  → (_getRoles(ROOT, caller) | _getRoles(resource, caller)) covers the role?
             ├─ yes → write, emit event
             └─ no  → revert EACUnauthorizedAccountRoles(resource, roles, caller)
```

Two functions are `virtual` — this is where a subclass extends the permission model:

- **`_getRoles(resource, account)`** — "what roles does this account have here?" Override to add role logic at read time (e.g. inherited/derived roles).
- **`_checkRoles(resource, roleBitmap, account)`** — "revert unless the account has these roles." Can be overridden to compute lazily (stop as soon as the required roles are covered) rather than computing the full `_getRoles` union.

`hasRoles` itself is **not virtual** — views that call it compute the full answer; only a custom `_checkRoles` can be lazy.

---

## 10. Registering names — go direct to the contracts if the UI app is unreliable

- A `.eth` name goes through ENS's `ETHRegistrar` with **commit-reveal**: commit a hash, wait `MIN_COMMITMENT_AGE` (60s on the beta), then register — this stops front-running.
  ```
  isAvailable(label) → getRegisterPrice(label, duration, token) → approve(registrar, total)
    → makeCommitment(...) → commit(c) → wait 60s → register(...)
  ```
- `getRegisterPrice` returns `(base, premium)` separately.
- The fee may be an ERC-20 (e.g. a MockUSDC on a beta deployment, often with a public `mint(address,uint256)` — no faucet needed; fund the account first).
- `makeCommitment` and `register` take the same arguments in the same order **except** `register` inserts `paymentToken` before `referrer`. Getting that wrong produces a commitment mismatch that looks like an expiry problem, not an argument-order problem.
- A subname is registered by whoever holds `ROLE_REGISTRAR` on root of the parent's registry, via `register(label, owner, subregistry, resolver, roles, expiry)`.
- A hackathon/beta registration **web app is only a convenience layer** over these contracts and can have its own bugs (e.g. a hardcoded gas limit on the "deploy resolver" step) — going direct to the contracts is reliable and not much slower.

---

## 11. Design notes worth stealing

- **Separate the writers.** If one contract can write both "the record that lowers trust" and "the binding of who owns this," the thing that can slash you can also reassign who gets slashed. Give those two write paths deliberately different holders.
- **Vendor-prefix your resolver keys.** ENS guidance: a bare key like `agent-foo` (hyphens only) is reserved for keys intended as a global standard; anything app-specific takes a prefix, e.g. `com.example.agent-foo`.
- **Check what the resolver implementation actually supports before designing around it.** A given Permissioned Resolver deployment may have *no* address records at all (no `addr(bytes32)`, no `addr(bytes32,uint256)`, no `setAddr`) even though `ROLE_SET_ADDRESS` exists in the role enum — the role existing doesn't mean the capability is implemented. If your design needs "does this name belong to this address," confirm forward resolution is actually available on this deployment before relying on it; a text-record "issuance" claim proves issuance, not ownership.
- **Write a proof script, not just unit tests.** A script that asserts on the *live chain* that a writer can write its intended keys and cannot write anything else, and that forbidden roles are genuinely absent, is the artifact that makes a security claim checkable by anyone in thirty seconds — and it is what catches the uint256/bytes32 selector bug (section 4) that a unit test against a mock cannot.

---

## 12. Twelve sentences to know by heart

1. ENSv2 gives every name its own registry; the name tree is a tree of contracts, walked with `getSubregistry`.
2. Each registry has its own EAC permission table; a grant in one means nothing in another.
3. One labelhash gives three IDs; the low 32 bits hold a version — token ID (changes on any role change) and resource (changes on re-issue or expiry).
4. Permissions are scoped to the resource, so re-issuing a name wipes its permissions, and an expired name's grants read as 0.
5. Roles are nybbles in a 256-bit bitmap; low half regular, high half admin; you can only grant what you're admin of.
6. On a name, admin bits come only at registration; later grants are regular only.
7. `ROOT_RESOURCE` means the whole registry; a check is root ∪ name.
8. EAC counts holders (max 15 per role) but can't list them — "who holds X" is not answerable on-chain.
9. A write goes: expiry check → `_checkRoles` → `hasRoles` → `_getRoles`; `_getRoles` and `_checkRoles` are virtual, `hasRoles` isn't.
10. Records live in resolvers under their own roles keyed by namehash, in a permission world separate from registry roles (`SET_SUBREGISTRY`, `SET_RESOLVER`).
11. A resource is `uint256` typed, not `bytes32` — the wrong type silently reads as "role absent," not as an error.
12. `try/catch` doesn't catch undecodable return data from an untrusted callee — use `staticcall` and check the return shape yourself.

---

## 13. Tooling notes

- Public Sepolia RPCs generally do not serve `debug_traceTransaction`. For human-readable traces, replay a fresh transaction with `cast run` (old/historical transactions can fail — pruned state) rather than relying on a trace RPC method.
- Trace/role decoding must be context-aware: only decode a return value as a role bitmap when you know the call was a `roles()`-shaped read or an EAC revert — decoding an unrelated hash or timestamp as a role bitmap produces nonsense that looks plausible.
- `vm.prank` (Foundry) is consumed by the first external call after it — including a view call used only to compute an argument. Cache constants/addresses before pranking, don't call through the pranked account to fetch them.
- Deploy scripts that read compiled bytecode from `out/` can pick up a stale build (e.g. a build left over from a mutation-testing run). Rebuild before deploying if anything unusual touched the build output in between.

---

## Glossary

| Term | Meaning |
|---|---|
| **anyId** | labelhash, token ID or resource — interchangeable in public functions |
| **EAC** | Enhanced Access Control: `roles[resource][account]` bitmaps |
| **resource** | a permission scope: one per name (versioned), or `ROOT_RESOURCE` (0) for the registry |
| **regular / admin role** | do the action / grant and revoke it (`<< 128`) |
| **`PermissionedRegistry`** | ENS's standard registry: entries as ERC-1155 tokens + EAC |
| **subregistry** | the registry holding a name's children |
| **resolver / `PermissionedResolver`** | holds a name's records; permissions per (namehash, part) |
| **Universal Resolver** | walks the tree for apps; falls back to a parent's resolver |
| **`ETHRegistrar`** | registers `.eth` names by commit-reveal |
| **`getParent` / `setParent`** | a registry's claim about where it sits in the tree |
| **`_getRoles` / `_checkRoles`** | the virtual role lookup / check a subclass can override |

---

## Where this came from

Extracted and generalized from two ENSv2 projects:
- **ENS Drive / Cascade** (ETHGlobal Tokyo 2026) — `CascadeSubregistryV2` overrides `_getRoles`/`_checkRoles` to let an account inherit regular roles from ancestor registries via team membership, up to 4 hops. See that repo's `docs/ensv2-guide.md` section 9 and `docs/contracts-explained.md` for the full worked example if a similar "inherited/derived permissions" shape is useful here.
- **Perjury** (ETHOnline 2026) — permissioned resolvers where only a specific contract (not any key-holder) may write a reputation record; direct-to-contract registration; `~/Documents/ensv2-insights.md` has that project's file-by-file reuse list (`eac.ts`, `registrar.ts`, `deployment.ts`, proof/registration scripts) if this new project's shape is similar enough to lift code rather than just facts.

Before trusting anything above as still true: confirm against the ENSv2 version this new project is actually building against — these are the mechanics as observed on two specific Sepolia beta deployments, and section 0 applies to every fact here, not just addresses.
