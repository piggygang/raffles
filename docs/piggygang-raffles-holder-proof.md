# PiggyGang Raffles — Holder proof: membership rules

How `claim_entries` decides that an NFT is a Piggy. Two of the three collections turn out to have no certified collection on-chain, so a collection-address check would reject them. This document covers the decision (spec D19), the mainnet verification behind it, the `Config` and Raffle-snapshot shape it hands to the account model, and the structure devnet fixtures must reproduce.

- **Issue:** PIG-111
- **Status:** decided — option A, recorded as spec D19
- **Date:** 2026-11-01
- **Changes:** [spec](./piggygang-raffles-v1-spec.md) §5, §6, §7, §10, §14 (D19), §15, E-E5, E-A2, E-A6, E-I2 (listed in §8)

## Contents

- [§0 — Document control](#0--document-control)
- [§1 — The answer](#1--the-answer)
- [§2 — Why the collection check fails](#2--why-the-collection-check-fails)
- [§3 — Mainnet verification](#3--mainnet-verification)
- [§4 — The rule](#4--the-rule)
- [§5 — Shape: Config, Raffle snapshot, claim_entries](#5--shape-config-raffle-snapshot-claim_entries)
- [§6 — Options not taken](#6--options-not-taken)
- [§7 — Hand-offs](#7--hand-offs)
- [§8 — Spec changes](#8--spec-changes)
- [§9 — Open questions](#9--open-questions)

## §0 — Document control

| Field | Value |
| --- | --- |
| Title | PiggyGang Raffles — holder proof by membership rules |
| Status | `Decided` — option A, the creator rule the downstream issues are already named for (PIG-84, PIG-81) |
| Issue | PIG-111 — blocks PIG-112 (spec and architecture revision), PIG-115 (devnet fixtures), PIG-89 (entry policy), PIG-133 (claim compute spike); feeds PIG-86, PIG-81, PIG-84, PIG-175 |
| Author | Marko Sabec — ALGOLAB |
| Evidence | Mainnet account reads on 2026-11-01 (§3) |
| Defers | The rest of the Config, Raffle and `EntryPosition` layouts (PIG-86) · accounts and compute per claim transaction (PIG-133) · the listed/frozen ownership policy (PIG-84, spec E-E4) |
| Changelog | `1.0 — 2026-11-01` — decision, verification and rule shape |

**What this document is authoritative for:** the membership-rule definition, its byte layout in `Config` and the Raffle snapshot, the per-NFT checks inside `claim_entries`, and the mainnet values `init_config` seeds.

## §1 — The answer

- **D19: membership rules, not collection addresses (option A).** `Config` holds three membership rules, one per Piggy collection, and every raffle snapshots them at create (D14). A rule's slot index is its bit in `EntryPosition.collections_seen`.
- **Token Metadata rule** (SOL Gang, Girl Gang). The metadata account belongs to Token Metadata and to the presented mint. One `creators[]` entry equals the rule's creator **with** `verified = true`, `update_authority` equals the rule's, and `symbol` (trailing NUL padding stripped) equals the rule's.
- **Core rule** (Piggy Gang). The asset account belongs to mpl-core, and its `update_authority` is `Collection(rule address)`.
- **Verified on mainnet.** The two Token Metadata rules match exactly the live listed mints (8,134 SOL Gang and 5,000 Girl Gang) and nothing else. Pig Mud shares the update authority but not the creator, and matches neither rule (§3).
- **Option B (certifying the collections) stays possible later** as a reserved rule kind. Option C (a Merkle allowlist) is rejected (§6).

## §2 — Why the collection check fails

Spec §5, §6 and E-E5, PIG-84 and PIG-86 all assumed every pig carries a verified Metaplex collection, checked against three addresses in `Config`. The chain says otherwise:

| Collection | Standard | Live today | On-chain membership signal | Collection check works? |
| --- | --- | ---: | --- | --- |
| Piggy SOL Gang | Token Metadata, candy-machine era | 8,134 of 10,000 listed | `collection: None` on every NFT. `creators[0]` = `Pigv3g…` verified, update authority `7Nsng…`, symbol `PSG` | No, it would reject every pig |
| Piggy Girl Gang | Token Metadata, candy-machine era | 5,000 of 5,000 | Same creator and update authority, symbol `PGG` | No |
| Piggy Gang | Metaplex Core | 745 | `update_authority = Collection(J3nH…)` | Yes |

The indexer already treats the two legacy collections this way. `config/collections.toml` finds them through closed mint lists (`tm_allowlist`), and records `verified_creator`, `update_authority` and `symbol` as their on-chain validation signals. Those are the same three fields the rule uses.

## §3 — Mainnet verification

Run on 2026-11-01 with read-only `getProgramAccounts` and `getMultipleAccounts` calls against the public mainnet RPC. Every returned account was decoded. The issue suggested a DAS sample; these queries read the accounts the program itself would read, and the update-authority query is exhaustive:

- **By update authority.** On Token Metadata, `memcmp` at offset 1 = `7Nsng…`. Offset 1 is the same in every metadata layout, so this returns every metadata account on mainnet with that update authority. The rule requires that update authority, so this set contains every possible match.
- **By creator.** On Token Metadata, `memcmp` at each of the five padded-layout creator offsets (326 + 34·k) = `Pigv3g…`, verified or not.
- **Core.** On mpl-core, `memcmp` on key `AssetV1` (offset 0), update-authority tag `Collection` (offset 33) and `J3nH…` (offset 34), plus the `CollectionV1` account itself.
- **Burned mints.** Every listed SOL Gang and Girl Gang mint without live metadata had its metadata PDA derived and confirmed closed.

### What the queries return

| Query | Accounts | Breakdown |
| --- | ---: | --- |
| Metadata with update authority `7Nsng…` | 15,200 | 8,134 SOL Gang · 5,000 Girl Gang · 2,066 Pig Mud. Nothing else. |
| Metadata naming creator `Pigv3g…` | 13,137 | 8,134 SOL Gang · 5,000 Girl Gang · 3 others (below) |
| Core assets in `Collection(J3nH…)` | 745 | Collection `current_size` 745, `num_minted` 747, update authority `7Nsng…` |
| Listed SOL Gang mints with no metadata | 1,866 | All 1,866 metadata accounts closed (burned). Girl Gang: none. |

### Rule outcomes

| Rule | Matches | Listed live mints matched | Matches outside the list | Listed live mints missed |
| --- | ---: | ---: | ---: | ---: |
| SOL Gang — `Pigv3g…` verified, `7Nsng…`, `PSG` | 8,134 | 8,134 | 0 | 0 |
| Girl Gang — `Pigv3g…` verified, `7Nsng…`, `PGG` | 5,000 | 5,000 | 0 | 0 |

### The three non-Piggy assets that name the creator

All three are rejected by the rule.

| Mint | Name · symbol | Update authority | `Pigv3g…` | Why the rule rejects it |
| --- | --- | --- | --- | --- |
| `GGQKLtqieP8nDTWc4pxRHjRNUZzE6KJJQmyhgzwasSf2` | Honorary Piggy 1 · `HPSG` | `Pigv3g…` | verified, `creators[0]` | Update authority and symbol differ. A creator-only check would admit it. |
| `2f9BfGPvxug4AZcBnKmSwxemS2LTJsEesYdviX3NKgQE` | #293 · `PSG` | `Pigv3g…` | unverified, `creators[1]` | Creator unverified, update authority differs |
| `DEMwpaWNoDyZzNDDb7euxF9iatVnWzKpa94MFbbogVHx` | #835 · `PSG` | `Pigv3g…` | unverified, `creators[1]` | Creator unverified, update authority differs |

The two `PSG` strays carry real pig names, the real symbol and `cdn.piggygang.com` URIs. They show that the name and symbol prove nothing on their own.

**Pig Mud is confirmed separate.** All 2,066 live Pig Mud NFTs (2,073 listed) carry creators `[5uJo… verified, 7Nsng… unverified]`, and none names `Pigv3g…`.

### Structure facts the program must tolerate

- `collection: None` on all 13,134 Token Metadata pigs.
- `token_standard` is `Some(NonFungible)` on 8,110 SOL Gang, and **absent** on all 5,000 Girl Gang and 24 SOL Gang. A check that requires `NonFungible` would reject 5,024 pigs.
- The metadata account is 607 bytes on 13,102 pigs and 679 bytes on 32, so the program must not assume a size.
- Every pig is `is_mutable = true`, so `7Nsng…` can still edit them (Image Rehost, §7).
- `Pigv3g…` sits at `creators[0]`, verified, with share 0. `7Nsng…` sits at `creators[1]`, unverified, with share 100.
- Both keys are ordinary keypairs (on-curve), not PDAs. `Pigv3g…` holds no account (0 SOL), and `7Nsng…` is a funded system wallet.

## §4 — The rule

### Token Metadata rule — kind 0, `TmCreator`

Per NFT, any miss fails the whole instruction (spec §6):

1. **Token account.** Owned by the classic SPL Token program, with `owner == signer` and `amount == 1` (spec §6, E-E4).
2. **Metadata account.** Owner is Token Metadata (`metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`), the key byte is `MetadataV1` (4), and `mint` equals the token account's mint. Token Metadata only creates metadata at the mint's PDA, so the owner plus the `mint` field binds the account to the mint. Re-deriving the PDA is equivalent.
3. **`update_authority == rule.update_authority`.**
4. **`data.symbol`, with trailing NUL bytes stripped, equals the rule's symbol.** The match is exact and case-sensitive, with no other normalisation.
5. **Some entry in `data.creators` (at most 5) has `address == rule.address` and `verified == true`.** Its position in the array doesn't matter.

Borsh-decode the account up to and including `creators`. Don't read fixed offsets: every pig is padded today (`creators[0]` at offset 326), but Token Metadata doesn't promise the padding survives later updates.

**Deliberately not checked:**
- `collection`, which is `None` everywhere.
- `token_standard`, which is absent on 5,024 pigs.
- The account size, `is_mutable`, `primary_sale_happened` and edition accounts.

The rule reads no field of the mint account. Whether the mint stays in the per-NFT account list is PIG-133's call.

### Core rule — kind 1, `CoreCollection`

1. **Asset account.** Owner is mpl-core (`CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d`), and the key byte is `AssetV1` (1).
2. **`owner == signer`** (bytes 1..33).
3. **`update_authority` is `Collection`** (tag 2 at byte 33), **with address `== rule.address`** (bytes 34..66).

All three fields sit at fixed offsets in the asset's base record. How Core freeze and transfer delegates (listings) are handled belongs to PIG-84 (E-E4).

### What the rule trusts

- **Only the verified flag authenticates.** In the Token Metadata rule, the one unforgeable signal is `verified = true` on `Pigv3g…`, and setting it takes `Pigv3g…`'s signature. The update authority and symbol only partition the creator's assets: an update authority can hand authority to any address without that address signing, and the symbol is free text. They tell SOL Gang from Girl Gang (symbol) and keep Honorary Piggy 1 out (update authority and symbol).
- **`Pigv3g…`'s key can mint eligibility.** Whoever holds it can verify it onto a fresh NFT, set the right symbol and update authority, and enter that NFT in any raffle. Under option B the collection authority would hold the same power, so A adds no new trust. The key still has to be kept like an upgrade key: cold, and never used for routine signing (Q1).
- **Core membership needs the collection's update authority.** An asset joins `Collection(J3nH…)` only with the signature of that collection's update authority (`7Nsng…`).
- **A leaked key is handled like any admin incident.** `update_config` fixes future raffles, and live raffles keep their snapshot (D14, E-A6). In a live raffle the cap limits each wallet, not the attacker, who can use many wallets. The response is to pause, which blocks `claim_entries`, and cancel the affected raffles (E-A1).

## §5 — Shape: Config, Raffle snapshot, claim_entries

### MembershipRule — 75 bytes, fixed size

| Offset | Field | Type | Bytes | `TmCreator` (0) | `CoreCollection` (1) |
| ---: | --- | --- | ---: | --- | --- |
| 0 | `kind` | `u8` | 1 | `0` | `1` |
| 1 | `address` | `Pubkey` | 32 | The verified creator | The Core collection |
| 33 | `update_authority` | `Pubkey` | 32 | The required metadata update authority | Zero |
| 65 | `symbol` | `[u8; 10]` | 10 | The symbol, NUL-padded. 10 bytes is Token Metadata's maximum. | Zero |
| | **total** | | **75** | | |

**Reserved kinds.** Kind 2 is reserved for `TmCollection`, where membership means `collection == { key: address, verified: true }`. That is the path to option B (§6). Kinds 3 and up are unassigned. The `u8` follows `PrizeKind` in the [registries design](./piggygang-raffles-registries.md).

**Why a flat struct, not a Rust enum.** Borsh enums are variable-length, while a fixed 75-byte record keeps `Config` and `Raffle` fixed-size and `memcmp`-able.

### Config and Raffle

- **`Config.membership_rules: [MembershipRule; 3]`** — 225 bytes, replacing the three collection addresses (96 bytes).
- **`Raffle.membership_rules: [MembershipRule; 3]`** — copied at `create_raffle` (D14). That is 129 bytes more than three addresses, about 0.0009 SOL more rent per raffle (129 × 6,960 lamports), paid by the creator and returned by `close_raffle`.
- **Slot `i` is bit `i` of `EntryPosition.collections_seen`.** Full Gang means bits 0–2 are all set.

**Mainnet values** (PIG-175):

| Slot | Collection | `kind` | `address` | `update_authority` | `symbol` |
| ---: | --- | ---: | --- | --- | --- |
| 0 | Piggy SOL Gang | 0 | `Pigv3gFWLWJL8QwrFBkdZLe1RYzNJTSJPGEUNVimJjh` | `7NsngNMtXJNdHgeK4znQDZ5xVzT2nkGoGRGhMWApejCV` | `PSG` |
| 1 | Piggy Girl Gang | 0 | `Pigv3gFWLWJL8QwrFBkdZLe1RYzNJTSJPGEUNVimJjh` | `7NsngNMtXJNdHgeK4znQDZ5xVzT2nkGoGRGhMWApejCV` | `PGG` |
| 2 | Piggy Gang | 1 | `J3nHgSDJj6CPj2ypuDWNuvuiYii965RcSmFAPQVDWA18` | zero | zero |

### init_config / update_config validation (PIG-81)

- `kind` is 0 or 1. Reserved kinds are rejected until they are implemented.
- `address` is non-zero.
- Kind 0: `update_authority` is non-zero. `symbol` is 1–10 bytes, NUL-padded, with no NUL before the last non-NUL byte.
- Kind 1: `update_authority` and `symbol` are all zero.
- **No two slots are identical.** Two identical slots would let two NFTs from one collection set both bits and fake the Full Gang bonus.
- **The admin attests that the addresses are the Piggy collections.** The program can't check this, just as with `Collection` prize entries (registries §4). Config changes are events in the admin change log.

Distinct rules could in principle still overlap. An NFT sets at most one bit, because its receipt is per mint. Keeping the three rules disjoint is the admin's job, and the mainnet three are: two symbols on one creator, and a Core collection.

### claim_entries, per NFT (PIG-84)

- **Instruction data carries a `rule_index: u8` (0–2) per NFT.** The program checks that NFT against `raffle.membership_rules[rule_index]` only, with no scan over the three, and on success sets bit `rule_index`.
- **Accounts per NFT.** The Token Metadata path takes the token account and the metadata. The Core path takes the asset. Each also takes its new `EntryReceipt`, at `[raffle, mint]` (the asset address for Core).
- **A rule miss fails the whole instruction** (spec §6). The app never builds such a transaction, because the service selects from the same three collections.

## §6 — Options not taken

- **B — certify the collections on-chain.** This means minting two collection NFTs and running `set_and_verify_collection` on every live mint: 13,134 transactions today (the issue's 15,000 predates the burns), each signed by the update authority. It is the cleanest end state, and the Girl Gang Image Rehost already plans a 5,000-mint metadata update it could ride on.
  - Not taken for v1, because it puts a mainnet migration in front of program work while SOL Gang keeps shrinking through the Core migration.
  - The way back: implement `TmCollection` (kind 2) and switch the slots with `update_config`, while live raffles keep their snapshot. If kind 2 isn't built in v1, the switch takes a program upgrade. Either way, no account migrates.
- **C — a Merkle allowlist of mints.** Rejected. 15,000 leaves need a 14-level proof, which is 448 bytes per NFT. That breaks the budget of about 6 NFTs per 1,232-byte transaction.

## §7 — Hand-offs

| To | What |
| --- | --- |
| PIG-86 — account model | The §5 layout: `[MembershipRule; 3]` in `Config` and in `Raffle` (225 bytes each), and slot `i` = bit `i` |
| PIG-81 — `init_config` / `update_config` | Both take `[MembershipRule; 3]`, validated as in §5 |
| PIG-84 — `claim_entries` | The §4 checks and `rule_index`. Tolerate a missing `token_standard`, both account sizes and `collection: None`. |
| PIG-133 — compute spike | Per NFT, the Token Metadata path needs 2 accounts plus the receipt (the rule needs no mint account), and the Core path 1 plus the receipt. Measure the Borsh decode of 607–679 bytes through `creators` against the ~6-per-transaction budget. |
| PIG-115 — devnet fixtures | Below |
| PIG-175 — mainnet `init_config` | The §5 mainnet values |
| Indexer / eligible-entries service | Keep the closed mint lists; today they equal the rule's output exactly (§3). The rule's fields are already in `collections.toml`. A live mint the rule matches but the list lacks means a new team mint and is worth an alert. |
| Girl Gang Image Rehost | The URI batch update must leave `update_authority`, `symbol` and `creators` unchanged, with `Pigv3g…` still verified. Rewriting the creators array or the symbol drops pigs out of eligibility. Change the URI only. |

### Devnet fixtures (PIG-115)

Reproduce the mainnet structure with devnet keys: a fixture creator keypair (standing in for `Pigv3g…`) and a fixture update authority (standing in for `7Nsng…`).

- **Two legacy Token Metadata sets**, symbols `PSG` and `PGG`, with `collection: None`, creators `[creator verified share 0, update authority unverified share 100]`, and update authority = the fixture update authority.
- **Decoder coverage.** A fresh devnet mint can't be relied on to reproduce a missing `token_standard`. Cover the decoder by cloning real mainnet metadata into localnet tests (a Girl Gang pig, a 679-byte pig, the three strays in §3, a Pig Mud), paired with synthetic token accounts.
- **One Core `CollectionV1`** under the fixture update authority, with assets added under its signature.
- **One negative fixture per rejection path:**
  - The creator present but unverified (the #293 case).
  - The creator verified, but with another update authority and symbol (the Honorary case).
  - The right creator and update authority, but another symbol.
  - The same update authority with another verified creator (the Pig Mud case).
  - Metadata for mint X presented with a token account for mint Y.
  - A byte-identical metadata account not owned by Token Metadata.
  - A Core asset in another collection.
  - A Core asset with `update_authority = Address`.

## §8 — Spec changes

Made in this revision of the [spec](./piggygang-raffles-v1-spec.md):

| Where | Was | Now |
| --- | --- | --- |
| §0 | D1–D18 | D19 added; changelog entry |
| §5 eligibility | "verified collection membership" | One of the three membership rules, named per collection |
| §6 on-chain check, "what does not count" | Verified collection in one of three addresses | The Token Metadata and Core rules; what authenticates and what only partitions |
| §7 account model | Config "3 collections"; Raffle snapshot "collections" | "3 membership rules"; snapshot "membership rules"; bit `i` = rule `i` |
| §10 snapshot at create | `collections` | `membership_rules` |
| E-E5, E-A2, E-A6, E-I2 | Collection addresses and flags | Membership rules |
| §14 | — | D19 row |
| §15 | — | `Membership rule` entry |
| §16 issue updates | — | D19 row for PIG-86 · PIG-81 · PIG-84 |

Left for PIG-112, as one-phrase fixes:
- Architecture §3h, eligible entries: "the raffle's snapshotted collections" becomes "the raffle's snapshotted membership rules".
- Registries §3, Config: "(collections, cap, …)" becomes "(membership rules, cap, …)".

## §9 — Open questions

| # | Question | Owner | Default if unanswered |
| --- | --- | --- | --- |
| Q1 | **Who holds `Pigv3g…`'s key, and where?** It is the root of eligibility for 13,134 pigs (§4). No v1 transaction needs it to sign. | DAO admin | Cold storage, no routine use. Confirm before PIG-175. |
| Q2 | **Do honorary pieces count?** Honorary Piggy 1 (`HPSG`, update authority `Pigv3g…`) is excluded by the rule and by the indexer. Counting honoraries would need a fourth rule, and the three slots are wired to the Full Gang bits. | Project lead | Excluded |
| Q3 | **Supply copy.** Spec §5 says 10,000 SOL Gang and 10,000 Piggy Gang. Live counts are 8,134 and 745, and 1,866 SOL Gang burns against 747 Core mints isn't the 1:1 swap the §15 glossary describes. None of this affects the rule; it does affect UI copy. | Project lead | Treat the numbers as caps, not live supply |
