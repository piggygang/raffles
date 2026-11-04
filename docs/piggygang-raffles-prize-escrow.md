# PiggyGang Raffles — Prize escrow: reclaim and Core prizes

Who can take a prize back out of escrow, and how a Metaplex Core asset gets in and out. The first question decides whether a raffle can stall on an absent creator. The second adds a new escrow path, because a Core asset has no token account.

- **Issue:** PIG-132
- **Status:** decided — spec D21 and D22
- **Date:** 2026-11-04
- **Changes:** [spec](./piggygang-raffles-v1-spec.md), [registries design](./piggygang-raffles-registries.md) and [rules design](./piggygang-raffles-rules.md), listed in §8

## Contents

- [§1 — The answers](#1--the-answers)
- [§2 — Who may call reclaim_prize](#2--who-may-call-reclaim_prize)
- [§3 — What mainnet and mpl-core show](#3--what-mainnet-and-mpl-core-show)
- [§4 — The Core escrow path](#4--the-core-escrow-path)
- [§5 — What can happen to an escrowed Core asset](#5--what-can-happen-to-an-escrowed-core-asset)
- [§6 — close_raffle waits for the prize](#6--close_raffle-waits-for-the-prize)
- [§7 — Hand-offs](#7--hand-offs)
- [§8 — Spec changes](#8--spec-changes)

## §1 — The answers

- **`reclaim_prize` is permissionless, and the prize can only go to `raffle.creator` (D21).** The crank can then settle every raffle, so none waits on its creator (§2).
- **Metaplex Core assets can be prizes (D22).** Mainnet shows Piggy Gang pigs can be escrowed today (§3). The asset is transferred to the Raffle PDA, and the allowlist gains one new kind, `CoreCollection` (§4).
- **`create_raffle` rejects Core assets that could leave escrow.** A permanent transfer, burn or freeze delegate, or any external plugin, fails at create. PIG-142 is confirmed, with this check replacing its "plugins that block the transfer" scope: a blocked transfer already fails on its own, and the real risk is a plugin that still works after escrow (§5).
- **`close_raffle` waits for the prize.** A new `prize_out` flag on the Raffle enforces it. Without the flag, closing a Raffle that still owns a Core asset would lose the asset for good (§6).

## §2 — Who may call reclaim_prize

| | Creator-only (spec until now) | Permissionless (D21) |
| --- | --- | --- |
| Caller | `raffle.creator` | Anyone; the crank in practice |
| Destination | The creator | Unchanged, and fixed by the program: the ATA of `raffle.creator`, or `raffle.creator` as owner of a Core asset |
| Guards | Zero entries after `end_ts` · claim window expired · Cancelled | Unchanged |
| Pause | Always open | Unchanged |
| Crank sweep | GM raffles only, through `raffles-gm` | Every raffle (architecture flow d) |

**Why permissionless.**

- **Every raffle settles without its creator.** Reaching Settled no longer depends on a partner remembering to come back.
- **DAO Drops need no proposal.** With the vault as creator, creator-only would mean a Squads vote for every prize that comes back.
- **Entrant rent comes back sooner.** If a winner never claims and the creator is idle, the next hourly pass settles the raffle at claim expiry, not 30 days later at the backstop.
- **There is nothing to gain by calling.** The guards are the same and the destination is fixed, so a stranger can only do the creator a favour, at their own gas cost.

**What it costs.**

- **The caller funds a missing ATA.** Reclaiming an SPL prize uses `init_if_needed`, because wallets often close an emptied token account. That is about 0.002 SOL from the crank's ops budget, only when the ATA is gone. The creator can recover it by closing the ATA. A Core prize has no ATA.
- **A creator can't leave a prize in escrow.** Nothing in the product needs that.
- **A compromised creator key gets the prize automatically.** The crank now does what the attacker could already do unaided. The destination was always that key, so registries §7e stands.

**The backstop stays.** With permissionless reclaim, R2's claim-expiry + 30 d grace looks redundant, but a reclaim can still fail when the prize can't move (E-S10). Entrant rent must not depend on that transfer.

**Sweep order.** Per raffle: `reclaim_prize`, then batched `close_entry_accounts`, then `close_raffle`. A reclaim that fails is retried on the next pass and alerts after repeated failures. It never blocks other raffles, and never blocks that raffle's entry-account closes once they are allowed.

## §3 — What mainnet and mpl-core show

**Piggy Gang on mainnet**, read from public RPC on 2026-11-04:

| Check | Result |
| --- | --- |
| Collection `J3nH…` plugins | `Royalties` only: 5%, one creator, rule set `None`. No external plugins. |
| Plugins on the 745 assets | None. No asset has a plugin of its own, and none is frozen. |
| Collection update authority | `7Nsng…`, the same key as in the holder-proof design |
| Holders | 103 owners. Neither `7Nsng…` nor the royalty wallet `5VPGC…` holds a pig. |

So a pig can be transferred to a PDA, and no plugin can take it back out. What isn't shown is that the DAO holds any pigs: the issue's "obvious first prizes" needs the DAO admin to name the wallet that will fund them.

**mpl-core source** (`main` on 2026-11-04, crate 0.12.1):

- **`TransferV1` takes no fee and pays no royalties.** `new_owner` can be any address, including a PDA.
- **Owner-managed plugins reset on transfer.** A `TransferDelegate`, `BurnDelegate` or `FreezeDelegate` the creator granted earlier has no power once the asset moves. Only the new owner could grant it again, and a Raffle PDA never does.
- **Permanent delegates can't be added later.** `validate_add_plugin` rejects them on assets and on collections after creation. An asset also can't be moved into a collection that has them (`PermanentDelegatesPreventMove`). So a check at create holds for the whole raffle.
- **Only five plugin types take part in a transfer:** `Royalties`, `FreezeDelegate`, `TransferDelegate`, `PermanentFreezeDelegate` and `PermanentTransferDelegate`. External plugin adapters can also reject one.
- **mpl-core checks the collection account itself.** A wrong one fails with `InvalidCollection`, so the Raffle doesn't need to store it.

## §4 — The Core escrow path

The Raffle PDA holds the prize either way: as the authority of an escrow ATA, or as the owner of a Core asset.

| Step | Token path (D11) | Core path (D22) |
| --- | --- | --- |
| Allowlist | Kinds 0 and 1 | Kind 2, `CoreCollection`: the account belongs to mpl-core with key `CollectionV1`. It admits any asset whose `update_authority` is `Collection(address)`. |
| `create_raffle` | Transfer to the escrow ATA | `TransferV1` CPI, creator signs, `new_owner` = Raffle PDA |
| `claim_prize` | To the winner's ATA | `TransferV1` CPI, Raffle PDA signs, `new_owner` = winner |
| `reclaim_prize` | To the creator's ATA | `TransferV1` CPI, Raffle PDA signs, `new_owner` = `raffle.creator` |
| `close_raffle` | Closes the escrow ATA | Nothing to close |

**Raffle fields** (PIG-86): `escrow_kind` (`u8`: token account or Core), `prize_out` (`bool`, §6). `prize_mint` holds the asset address for a Core prize. The collection isn't stored: each instruction takes it as an account, and mpl-core validates it.

**The check at create (E-C10).** On the Core path, `create_raffle` also verifies:

1. The asset belongs to mpl-core with key `AssetV1`, which excludes compressed assets.
2. Its `update_authority` is `Collection(entry.address)`.
3. Neither the asset nor the collection has a `PermanentTransferDelegate`, `PermanentBurnDelegate` or `PermanentFreezeDelegate`.
4. Neither has an external plugin adapter.

Check 3 is the same reasoning as RD10, which keeps Token-2022 out: a prize someone else can reach isn't escrowed.

**Single-asset entries wait.** Kind 3 (`CoreAsset`) stays unassigned. Piggy Gang needs only the collection kind, and a standalone asset is a separate path to test and audit. Adding it later needs a program upgrade but no account migration.

## §5 — What can happen to an escrowed Core asset

| Case | Effect | Handled by |
| --- | --- | --- |
| Permanent transfer or burn delegate | Its authority takes or destroys the prize | Rejected at create, and can't appear later (§3) |
| Permanent freeze delegate | Its authority locks the prize | Rejected at create, and can't appear later |
| External plugin present at create | Can reject the transfer out | Rejected at create |
| Frozen asset, or a rule set that refuses the Raffle program | The transfer in fails | `create_raffle` fails atomically (E-C4) |
| Delegate the creator granted before escrow | None | Reset by the transfer (§3) |
| Update authority adds an Oracle plugin or a blocking rule set **after** escrow | The prize is stuck, but can't be taken | Vetting at allowlisting (registries §7c), then E-S10 |

The last row is the one risk the program can't close. A collection's update authority can block a transfer at any time, as an SPL issuer with a freeze authority can. It can't move the asset. For Piggy Gang that authority is the team's own key. For a partner's Core collection, the admin accepts it when allowlisting.

A rule set that lets the transfer in also lets it out to an ordinary wallet, because mpl-core tests both the signer's and the new owner's owning programs. The two directions only swap those programs.

## §6 — close_raffle waits for the prize

The token path has a natural stop: an account with a balance can't be closed. The Core path has none. Only the Raffle PDA can sign the asset out, so closing the Raffle while it owns a pig loses the pig for good. No instruction could recover it, and the admin has no override.

- **`claim_prize` and `reclaim_prize` set `prize_out`.** `close_raffle` requires it, on both paths.
- **It matters for Cancelled.** Settled always means the prize has left, but a Cancelled raffle holds the prize until `reclaim_prize` runs. PIG-153's "terminal, with entry accounts closed or past the backstop" isn't enough on its own.
- **It also stops a second reclaim** on a Cancelled raffle, which stays Cancelled after the first.
- **A raffle whose prize can't move stays open.** Its creator waits for the Raffle rent. Entrants don't, because the entry accounts close on their own terms (E-S10).

## §7 — Hand-offs

| To | What |
| --- | --- |
| PIG-86 — account model | `escrow_kind` and `prize_out` on the Raffle; `prize_mint` holds a Core asset's address (§4) |
| PIG-140 — allowlist instructions | `allowlist_add` accepts kind 2 with the check in registries §4 |
| PIG-85 — `create_raffle` | Branches on the admitting entry's kind. The token path is unchanged, and the Core branch lands with PIG-142. |
| PIG-142 — Core escrow | **Confirmed.** Scope: the §4 path through `create_raffle`, `claim_prize` and `reclaim_prize`, and the E-C10 check, replacing "plugins that would block the escrow transfer". Test against a cloned mainnet pig and collection. Add cases for each rejected plugin, and for a Cancelled raffle that can't close before the reclaim. |
| PIG-82 — `claim_prize`, `reclaim_prize` | `reclaim_prize` takes any signer, pays only `raffle.creator`, funds a missing ATA through `init_if_needed`, and sets `prize_out`, as does `claim_prize` (§2, §6). Test a stranger's reclaim, a redirected destination, and a second reclaim. |
| PIG-153 — `close_raffle` | Requires `prize_out` (§6) |
| PIG-147 — `close_entry_accounts` | No change. The backstop stays (§2). |
| PIG-158 — crank sweeps | The `reclaim_prize` sweep applies to every raffle, in the §2 order, with failures retried and alerted |
| PIG-161 — `raffles-gm` | Drop the own-prize reclaim. Reclaimed prizes land in the GM wallet and count as inventory. |
| PIG-73 — `/create` | Core assets in the wallet grid, and the Core accounts in the transaction |
| PIG-71 — `/admin` | Kind 2 in the add-prize form |
| PIG-127 — rules page | The `prize.mint` and `prize.escrow` cross-checks for a Core prize (rules design §4) |
| PIG-119 — indexer decoding | `escrow_kind` on `RaffleCreated`, and the caller on the reclaim event |
| PIG-136 — runbooks | The Core vetting item in registries §7c |
| DAO admin | Name the wallet that will fund Core prizes (§3) |

## §8 — Spec changes

Made in this revision of the [spec](./piggygang-raffles-v1-spec.md):

| Where | Change |
| --- | --- |
| §0 | D21 and D22; changelog entry |
| §3 | Reclaim added to the permissionless steps and the crank's row |
| §7 state diagram, transition table, timeline | `reclaim_prize` caller is anyone; `close_raffle` needs the prize out |
| §7 account model | Prize escrow covers a Core asset |
| §9 | The critical gate, prize settlement, `close_raffle` and the who-pays table |
| §10, E-C6 | Reclaim rights become the reclaim destination |
| E-C10 (new) | Core prizes that could leave escrow |
| E-D1, E-S1, E-S2, E-S5, E-S8, E-S9, E-A1 | Follow D21 and D22 |
| E-S10, E-S11 (new) | A prize that can't move; a stranger's reclaim |
| §14 | D21 and D22 rows |
| §15 | `crank` updated; `Core prize` added |
| §16 | Checklist line and issue-update rows |

Also changed: registries §3, §4, §5, §7c, §7e and §11 Q2, and in the rules design and template the Core values of `prize.mint` and `prize.escrow`.

Left for PIG-112: architecture §9's "Raffle PDA + escrow ATA" row gains the Core case. Flow d already matches D21.
