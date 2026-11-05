# PiggyGang Raffles — Rules publishing

Every raffle carries published rules (spec Invariant 2, D16). This document decides where the rules document lives, how the chain commits to its exact bytes, what the document contains, and how the browser and `raffles-gm` publish it. The template itself is [`piggygang-raffles-rules-template.md`](./piggygang-raffles-rules-template.md).

- **Issue:** PIG-110
- **Status:** decided — spec D20; the template text is a draft pending legal review (§9)
- **Date:** 2026-11-02
- **Resolves:** architecture §9 flag 2 (rules content must be tamper-evident)

## Contents

- [§0 — Document control](#0--document-control)
- [§1 — The answers](#1--the-answers)
- [§2 — Hosting](#2--hosting)
- [§3 — Integrity: rules_hash](#3--integrity-rules_hash)
- [§4 — Document format](#4--document-format)
- [§5 — Publishing flows](#5--publishing-flows)
- [§6 — GM raffles](#6--gm-raffles)
- [§7 — Hand-offs](#7--hand-offs)
- [§8 — Spec changes](#8--spec-changes)
- [§9 — Open questions for the legal reviewer](#9--open-questions-for-the-legal-reviewer)

## §0 — Document control

| Field | Value |
| --- | --- |
| Title | PiggyGang Raffles — rules hosting, integrity and template |
| Status | `Decided` — hosting, hash, format and GM approach (spec D20). Template text: `Draft` until the legal reviewer signs off (§9). |
| Issue | PIG-110 — blocks PIG-112 (spec revision), PIG-124 and PIG-161 (GM scheduler and publishing), PIG-127 (rules page), PIG-141 (`create_raffle` rules fields); related PIG-85, PIG-86, PIG-165, PIG-65, PIG-138 |
| Author | Marko Sabec — ALGOLAB |
| Defers | Raffle PDA layout and seeds (PIG-86) · `create_raffle` instruction layout (PIG-141) · rules page and upload UI (PIG-127, PIG-165) · `raffles-gm` implementation (PIG-161) |
| Changelog | `1.0 — 2026-11-02` — decision, format and template draft |

**What this document is authoritative for:** the rules hosting choice, the `rules_hash` definition and verification, the front-matter schema, the template rules, and the publishing order for both creators.

## §1 — The answers

- **Hosting: permanent Arweave storage, uploaded through ArDrive Turbo.** Irys, the issue's suggestion, stopped uploading to Arweave on 2026-11-01 (§2). For an ordinary raffle the creator's wallet signs and pays for the upload in SOL. For a Squads raffle the proposer's own wallet does, because the vault can't sign an upload (§5b). `raffles-gm` signs and pays with the GM key.
- **Integrity: a `rules_hash` on the Raffle.** It is the sha256 of the exact document bytes, passed to `create_raffle` and stored next to `rules_uri`. The app renders rules only when the fetched bytes hash to it. The hash is the commitment; Arweave only provides availability, so any copy that matches is authentic (§3).
- **Format: Markdown with YAML front-matter.** The front-matter holds machine-readable terms that the rules page cross-checks against the chain. The body is the human-readable rules, generated from a fixed, logic-free template (§4).
- **GM raffles: one document per raffle,** generated and uploaded by `raffles-gm` with the same template. A standing document per cadence would leave the prize and dates to chain lookups, which is exactly what needed legal sign-off; per-raffle documents need no special approval and cost almost nothing (§6).

## §2 — Hosting

| Option | Permanence | Pays | Verdict |
| --- | --- | --- | --- |
| **Arweave via ArDrive Turbo** | Permanent Arweave data | Creator, in SOL, from the browser wallet | **Chosen** |
| Arweave via Irys | — | — | Gone: Irys's legacy Arweave endpoints retired on 2026-11-01 |
| Irys L1 | Irys's own chain, in mainnet beta | SOL | Not Arweave, and too new to hold a legal artifact |
| IPFS + pinning | Only while someone keeps paying a pinning service | DAO, forever | Rejected: availability depends on an open-ended subscription |
| Plain HTTPS | Mutable | DAO | Rejected: tamper-evident only with the hash, and gone when the site goes |

**What changed since the issue was written.** Irys's migration guide says `node1.irys.xyz` and `mainnet.arweave.irys.xyz` "send uploads to Arweave and will be retired on 1 November 2026", and that `uploader.irys.xyz` "sends new uploads to Irys L1 mainnet". Data already on Arweave stays, but new uploads through Irys no longer go there.

**Why Turbo.** It defaults to Arweave mainnet ("an Arweave upload is permanent"). It signs uploads with a browser Solana wallet (`TurboFactory.authenticated({ walletAdapter, token: 'solana' })`) or a server key, and it takes SOL, either as a top-up or on demand at upload time. Uploads carry custom tags, including `Content-Type`. A small free-tier byte allowance exists per wallet, but its size isn't documented, so the design doesn't depend on it.

**The host is replaceable.** Because the chain stores the hash, Turbo is a convenience, not a trust party. If Turbo disappears, any Arweave upload path works, and an archived copy of the bytes from anywhere still proves itself against `rules_hash`.

### URI and gateways

- **`rules_uri` is `ar://<id>`**, 48 bytes, where `<id>` is the 43-character base64url Arweave data-item ID Turbo returns. The generators emit only this form. The program checks only that it is 1–96 bytes of UTF-8 and doesn't parse the scheme, so a later storage change needs no program upgrade. The rules page enforces the format, before any fetch.
- **The app resolves `ar://<id>`** through `https://arweave.net/<id>` first, then a configured list of other ar.io gateways. It rejects any other scheme or a malformed ID without fetching, because `rules_uri` is creator-supplied and the page must never request an arbitrary URL. No gateway is trusted, because the hash check (§3) runs on whatever comes back.
- **Upload tags** are for discovery only and are never trusted: `Content-Type: text/markdown; charset=utf-8`, `App-Name: piggygang-raffles`, `Rules-Schema: piggygang-raffles-rules/1`, `Raffle: <raffle address>`, `Cluster: <cluster>`, `Rules-Sha256: <hex>`.

### Devnet

Devnet raffles upload to Turbo's testnet sandbox (upload `https://upload.services.ar-io.dev`, gateway `https://ar-io.dev`). Its data is purged after about 3 days and never reaches mainnet Arweave. So a devnet rules page older than that shows "rules document no longer available (devnet)", and the hash check is testable inside the window. Upload and gateway URLs are cluster config next to `lib/cluster.ts`, never mixed across clusters.

Sources, checked 2026-11-02: [Irys — Migrating to the Irys L1](https://docs.irys.xyz/build/d/migrating), [Irys — mainnet and devnet bundlers](https://docs.irys.xyz/onchain-storage/mainnet-devnet), [ar.io — Turbo SDK](https://docs.ar.io/sdks/turbo-sdk/), [ar.io — TurboAuthenticatedClient](https://docs.ar.io/sdks/turbo-sdk/turboauthenticatedclient/).

## §3 — Integrity: rules_hash

### Definition

- **`rules_hash` = sha256 of the document bytes exactly as uploaded.**
- **The bytes are canonical by construction:** UTF-8 without a BOM, LF line endings only, the front-matter's `---` at byte 0, and exactly one trailing LF. The generator normalizes before hashing, and uploads the same buffer it hashed.
- **On-chain it is 32 raw bytes.** Everywhere else (UI, tags, logs) it is 64 lowercase hex characters.

### On-chain fields (PIG-86, PIG-141)

| Where | Field | Type | Rule |
| --- | --- | --- | --- |
| `create_raffle` args, Raffle PDA | `rules_uri` | `String`, max 96 bytes | Non-empty (E-C8); the rules page enforces `ar://<id>` (§2) |
| `create_raffle` args, Raffle PDA | `rules_hash` | `[u8; 32]` | Not all zero (E-C8) |
| `RaffleCreated` event | both | as above | History after `close_raffle` removes the PDA (architecture §9) |

That is 4 + 96 + 32 = 132 bytes on the Raffle, about 0.0009 SOL of rent (132 × 6,960 lamports). The creator pays it and gets it back at `close_raffle`.

The program can't read the document, so it can't check that the content is right; it only guarantees that the content can never change. Getting the content right is the generator's job, and checking it is the rules page's (§4).

### Verification on the rules page (PIG-127)

1. **Check `rules_uri`.** If it isn't `ar://<id>`, fetch nothing: show the hash, the URI and a warning (E-I6).
2. **Fetch it** through the gateway list (§2) as raw bytes.
3. **Hash the bytes** and compare with the on-chain `rules_hash` (from the Raffle, or the indexer's `RaffleCreated` record once the PDA is closed).
4. **On a hash match:** run the §4 cross-checks against the same source. If they all pass, render the document with "Rules fingerprint verified · sha256 …" and a link to the permanent copy. If any fails, render it as unverified under the mismatch banner, without that label (E-I7). Content-addressed bytes never change, so the page can cache the document indefinitely, keyed by hash.
5. **On a hash mismatch:** never render the fetched text as the rules. Show a warning with both hashes, and try the next gateway.
6. **If nothing is reachable:** show the hash and the URI, and say the rules document is temporarily unavailable. The raffle itself is unaffected (E-I6).

## §4 — Document format

### Front-matter

YAML restricted to the JSON subset in block style: maps, double-quoted strings and integers only. There are no anchors, tags or multi-line scalars, so any strict parser reads it identically. The template fixes the keys and their order, and the generator fills the values: strings JSON-escaped inside the template's quotes (a JSON string is a valid YAML double-quoted scalar), integers bare. The template file itself isn't valid YAML until filled, because its bare integer placeholders sit in the braces.

| Key | Type | Example | Rules page cross-checks against |
| --- | --- | --- | --- |
| `schema` | string | `"piggygang-raffles-rules/1"` | Known schema versions |
| `cluster` | string | `"mainnet-beta"` | The app's build cluster |
| `program` | string | Program ID | The configured program ID |
| `raffle` | string | Raffle PDA | The raffle being viewed |
| `creator` | string | Creator wallet | `raffle.creator` |
| `organizer.name` | string | `"PiggyGang DAO"` | — (`CreatorEntry.label` for partners is a hint, not a check) |
| `organizer.contact` | string | `"raffles@piggygang.net"` | — |
| `title` | string | Raffle title | The on-chain title (architecture §9 flag 1) |
| `prize.mint` | string | Mint address, or the asset address of a Core prize | The Raffle's prize mint or asset |
| `prize.amount` | string | `"1"`, in base units | The escrowed amount at create (`RaffleCreated`) |
| `prize.display` | string | `"Piggy Gang #4521 (NFT)"` | — |
| `prize.escrow` | string | Escrow ATA, or the Raffle PDA for a Core prize | The ATA derived from Raffle + mint, or for a Core prize the Raffle, which owns the asset |
| `ends_at` | string | `"2026-11-09T18:00:00Z"`, whole seconds | `raffle.end_ts` |
| `entry.cap` | integer | `10` | The effective per-raffle cap (D6) |
| `entry.full_gang_bonus` | integer | `3` | The snapshotted bonus |
| `claim_window_days` | integer | `30` | The program constant (D5) |
| `min_age` | integer | `18` | — |
| `terms_url` | string | `"https://raffles.piggygang.net/terms"` | — |
| `lang` | string | `"en"` | — |

**A cross-check mismatch is a creation defect.** The generator builds the document and the transaction from the same inputs, so a mismatch means something changed between the two, for example a config edit. The page still shows the document, because it is the one the raffle committed to, but as unverified: a banner names the field and both values, and the verified label is withheld (E-I7). Nothing cancels automatically, because the program can't read the document. The admin decides whether the misstatement warrants a cancel (E-A1), which is possible only until the draw is requested.

**The start time isn't in the document.** It isn't known until the creation transaction lands. The body says the raffle opens on confirmation, and the page shows the on-chain creation time.

### Body

- **The template is logic-free.** Every placeholder is `{{dotted.key}}` naming a front-matter key, plus `{{description}}`, the organizer's free text. There are no sections, loops or conditionals.
- **No gaps.** The generator fails on an unknown or empty placeholder rather than shipping a gap. The one exception is an empty `description`, which becomes "No description provided."
- **Escaping depends on where the placeholder sits.** In the front-matter, values are JSON-escaped. In the body, the organizer's text (`title`, `description`, `organizer.*`) has Markdown control characters escaped. Chain values (addresses, integers, the timestamp) are validated formats and go in verbatim.
- **Organizer text renders as plain text.** The rules page renders the body with raw HTML disabled, and organizer-supplied links aren't made clickable.
- **The description goes last,** under a heading that says it can't change the numbered rules above it.
- **The output is deterministic.** The same inputs give the same bytes, so a failed create retried with the same inputs reuses the same document and hash. The browser generator (TypeScript, PIG-165) and the one in `raffles-gm` (Rust, PIG-161) must agree byte for byte, which a shared golden test vector proves: inputs → document → sha256.
- **The template is versioned.** `schema` names the template version that produced a document. Template text changes only with legal sign-off, and bumps the version.

### Permanence and personal data

Arweave can't delete anything. Every published field is public forever.

- **`organizer.contact` must be an organizational contact** (a role address or a support URL), never a person's name or private email. This is the same rule as `CreatorEntry.label` in the registries design.
- **`/create` warns before upload** that the title and description are published permanently.
- **Entrants' data never appears.** The document names wallets only as the organizer's creator key.

## §5 — Publishing flows

The document must exist before `create_raffle`, because the transaction carries its hash. It names the raffle address, so **the Raffle PDA must be derivable before creation** (PIG-86): seeds such as `[b"raffle", creator, nonce]` with a creator-chosen `u64` nonce, and no global counter that a concurrent create could advance underneath.

### a — Browser, `/create` (PIG-165)

1. **The creator fills the form.** The app reads Config fresh, picks a nonce, and derives the raffle and escrow addresses.
2. **The app generates the document,** hashes it, and shows the rendered rules for review.
3. **Wallet prompt: sign the Turbo upload.** If the wallet's free allowance or credits don't cover it, Turbo's on-demand funding adds a small SOL transfer prompt. The app quotes the price beforehand with `getTokenPriceForBytes`.
4. **Wallet prompt: sign `create_raffle`** with `rules_uri` and `rules_hash`.
5. **If step 4 fails or is abandoned,** the uploaded document is an orphan: harmless, because it names a raffle that doesn't exist. Retrying with the same inputs and nonce regenerates identical bytes and reuses the same upload.

So the creator sees two or three prompts. Turbo is a third-party service, not our server, and it receives only the public document, never a transaction (architecture Invariant B holds).

### b — A Squads vault as creator

A vault can't sign a Turbo upload. The proposer uploads the document with their own wallet, and the vault transaction carries the hash. Who uploaded doesn't matter: the hash in the creator-signed transaction is the binding.

### c — `raffles-gm` (PIG-161)

1. **Pre-flight:** prize inventory, SOL balance and the upload price. If any check fails, skip the period ("refuses to half-create", architecture §3e).
2. **Generate the document** for this period, upload it signed by `GM_CREATOR_KEYPAIR`, and pay from that key's SOL.
3. **Send `create_raffle`.**
4. **On a retry within the period,** the same inputs give the same bytes. `raffles-gm` is stateless, so re-uploading is fine; the cost is negligible and the orphan is harmless.

Turbo's SDK is TypeScript, and `raffles-gm` is Rust. PIG-161 either signs ANS-104 data items in Rust against Turbo's HTTP upload API, or calls a small pinned Node helper. That choice belongs to the services team, as long as the output bytes match the golden vector.

## §6 — GM raffles

| Option | Legal artifact | Ops | Verdict |
| --- | --- | --- | --- |
| **One document per raffle, from `raffles-gm`** | Self-contained: names this prize, these dates, this raffle | One ~6 KB upload per raffle, about 420 a year at daily + weekly | **Chosen** |
| One standing document per cadence | Incomplete without chain lookups for the prize and dates | One upload per template version | Rejected: needs the legal reviewer to accept an incomplete artifact, to save a negligible cost |

The architecture's per-period idempotency tag could double as the raffle nonce for GM. Seeds `[b"raffle", gm_creator, period_tag]` would make a second create in the same period fail at `init`, and would give the document its raffle address deterministically.

## §7 — Hand-offs

| To | What |
| --- | --- |
| PIG-86 — account model | `rules_uri` (≤ 96 bytes) and `rules_hash` (`[u8; 32]`) on the Raffle. Raffle seeds derivable before creation, with no global counter (§5). |
| PIG-141 / PIG-85 — `create_raffle` | Instruction data carries `rules_uri` and `rules_hash`. Reject an empty URI, a URI over 96 bytes, or an all-zero hash (E-C8); the URI's format is the rules page's check (§2). `RaffleCreated` carries both. Optional hardening: take the effective cap explicitly and assert the bonus equals the Config value, so the document's numeric terms equal the snapshot by construction. |
| PIG-127 — rules page | The §3 verification steps, starting with the URI format check; the §4 cross-checks and mismatch banner; the verified label only when all of them pass; raw HTML disabled; and caching by hash |
| PIG-165 — `/create` publishing | Generator (§4), the Turbo upload with tags (§2), the prompt order (§5a), the permanence warning, and the cluster-scoped upload and gateway config |
| PIG-124 / PIG-161 — GM | Per-raffle documents (§6), pre-flight including the upload price, the period tag as nonce, and the golden vector in Rust |
| PIG-65 — user guide | "How to check the rules weren't changed": the fingerprint on the rules page and the permanent copy |
| Legal reviewer (PIG-138) | The template text and the §9 questions |

## §8 — Spec changes

Made in this revision of the [spec](./piggygang-raffles-v1-spec.md):

| Where | Change |
| --- | --- |
| §0 | D20; changelog entry |
| §2 Invariant 2 | `create_raffle` requires `rules_uri` **and** `rules_hash`; the page renders only a document that matches the hash |
| §7 transition table, account model | Guard and Raffle fields include `rules_hash` |
| E-C8 | Also rejects an all-zero hash |
| E-I6 (new) | `rules_uri` not `ar://<id>`, or the rules document unreachable or not matching its hash |
| E-I7 (new) | Document matches its hash, but a cross-checked term differs from the chain |
| §12 `/create` row, required legal elements | The upload step; rules shown only when the hash matches; the verified label also needs the cross-checks; field list here |
| §14 | D20 row |
| §15 | `rules_hash` entry |
| §16 | D20 checklist line and issue-update row |

Applied by PIG-112: architecture §9 flag 2 now reads "resolved by spec D20: Arweave via Turbo plus `rules_hash` on the Raffle".

## §9 — Open questions for the legal reviewer

The template is a draft. Everything below needs the legal reviewer's answer before the template's first mainnet use.

| # | Question | Template default |
| --- | --- | --- |
| L1 | **Who is the organizer of DAO Drops and GM raffles?** The rules must name an identifiable organizer with contact details; the DAO itself may not be a legal person. | `organizer.name` = "PiggyGang DAO" as a placeholder |
| L2 | **Language.** Is an English-only document enough for a *nagradna igra*, or is a Slovene version required? | English only (`lang: "en"`) |
| L3 | **Prize tax.** Is the §8 wording right, and does it hold for partner giveaways, where the partner is the organizer? Spec D17 places the duty on the DAO. | DAO handles it off-chain |
| L4 | **Duration.** Is "opens when the creation transaction confirms, closes at `ends_at` UTC" an acceptable statement of duration? | As written |
| L5 | **Precedence.** Rules vs organizer description (rules win), and rules vs terms of service. | Rules win over the description; the terms apply alongside |
| L6 | **Missing clauses.** Governing law, complaints handling, and a privacy notice link for the off-chain tax process. | Not included yet |
| L7 | **Permanence.** Is permanent, undeletable publication of the organizer's details acceptable? | Organizational contacts only (§4) |
