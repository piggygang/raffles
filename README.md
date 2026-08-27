# Piggy Raffles

Free raffles for holders of the three Piggy collections — nobody ever pays to enter. The product spec and system architecture live in [`docs/`](docs/).

Next.js App Router frontend, cloned from the dressme skeleton so the PiggyGang apps share one look. Wallets connect via Wallet Standard and sign in the browser; the app never holds a key.

## Run

```sh
pnpm install
pnpm dev          # http://localhost:3000
```

Checks (what CI runs):

```sh
pnpm lint
pnpm exec next typegen && pnpm exec tsc --noEmit
pnpm build
```

## Environment

Works with no environment at all — defaults target devnet.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet` | `devnet` or `mainnet-beta`; anything else fails the build |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | per-cluster default | Browser RPC for blockhashes and confirmations; rate-limit and domain-restrict it at the provider |

Vercel: zero-config import. Previews stay on devnet; production sets `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta`.

## Wallet smoke test

`/dev/wallet` (unlinked, noindex) connects a wallet and signs one Memo transaction on the configured cluster — the scaffold's acceptance check. Switch the wallet app itself to devnet first.
