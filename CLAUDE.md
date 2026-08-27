# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Git rules

- NEVER commit or push. When work is ready, suggest a commit message and let the user run git themselves.
- Suggested commit messages must be a single line, with no Co-Authored-By trailer or any other Claude/AI attribution.

## Commands

Use pnpm (version pinned via `packageManager` in package.json; Node 24 via `.tool-versions`).

- `pnpm dev` — dev server at http://localhost:3000
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — ESLint (flat config in `eslint.config.mjs`)
- `pnpm exec next typegen && pnpm exec tsc --noEmit` — typecheck (no package script exists for this; `next typegen` generates `next-env.d.ts` and route types first)

No test framework is configured.

## Architecture

Next.js 16.3.0 App Router project with TypeScript strict mode and React 19, cloned from dressme's skeleton so the org's apps share one look. The product spec and system architecture live in `docs/` (`piggygang-raffles-v1-spec.html`, `piggygang-raffles-architecture.html`) — the spec is signed off and the architecture doc names the backends: reads come from the indexer's public `/v1` API (arrives with the raffle pages), writes are browser-signed transactions straight to RPC.

- Routes live in `app/` at the repo root (no `src/`). `app/layout.tsx` loads Geist fonts via `next/font/google`; theme tokens live in `app/globals.css` (Tailwind v4 `@theme inline` — there is no tailwind.config). Path alias `@/*` maps to the repo root.
- Layouts/pages use Next 16's generated route-typed props (`LayoutProps<"/">`) as ambient globals; `pnpm exec next typegen` generates them without a full build.
- Chrome (header/footer) is rendered by each page, not the root layout — `<body>` is a flex column whose children must stay the header, `main.flex-1` and footer. Pages pass `<SiteNav />` and `<ConnectButton />` into the header's children slot.
- Cluster is build-time config in `lib/cluster.ts`: `NEXT_PUBLIC_SOLANA_CLUSTER` unset → devnet (the only safe default), invalid → build error. The Wallet Standard chain string is `solana:mainnet`, never `solana:mainnet-beta`.
- `pnpm-workspace.yaml` exists only for pnpm settings; sharp is **enabled** (unlike dressme), so `next/image` is usable once remote prize media lands — add `images.remotePatterns` to `next.config.ts` at that point.

## Wallet & signing

Unlike dressme, connecting here is **not** read-only — this app signs and sends transactions. That reversal is deliberate and this section is its documentation.

- `lib/wallet.ts` is Wallet Standard discovery **and signing** via `@wallet-standard/app`, deliberately not `@solana/wallet-adapter-*` and not web3.js (no Buffer polyfill in the bundle). Types are structural. `connect()` returns full `WalletAccount` objects because `solana:signAndSendTransaction` needs the account (with its `publicKey` bytes) handed back — never reduce it to addresses again.
- The wallet filter requires the configured chain plus the sign-and-send feature: a wallet that cannot sign would connect and then dead-end at every action.
- `lib/tx.ts` hand-serializes the one transaction the scaffold sends (legacy tx, Memo program, zero-filled signature placeholder — the canonical unsigned wire form every major wallet accepts). Real program transactions (claim, create) may introduce `@solana/kit` when they arrive; until then the dependency stays out.
- `lib/solana-rpc.ts` is the entire chain surface: `getLatestBlockhash` before signing, `confirmTransaction` (a 2 s `getSignatureStatuses` poll, 90 s timeout) after. Resist growing this; dressme's holdings reads return here verbatim when eligibility work needs them.
- `lib/rpc-endpoint.ts` ships a per-cluster default endpoint; holders may override it from the wallet modal (localStorage, cluster-scoped key so a devnet override cannot leak into a mainnet build). `NEXT_PUBLIC_` RPC URLs are world-readable by nature — rate-limit and domain-restrict at the provider.
- No user key or user-signed transaction ever touches a server: the browser builds, the wallet signs and broadcasts, the app only watches the signature.
- The wallet chooser is a native `<dialog>` (top layer, no z-index). On mobile user agents with no wallet detected it offers Phantom/Solflare/Backpack universal links that reopen the page inside the wallet's own browser, where Wallet Standard registration works.

## Transaction toasts

`components/tx/tx-provider.tsx` — `useTx().track(label, signature)` hands a just-broadcast signature to the toast stack, which polls it to confirmed/failed/timeout with an explorer link. Signing itself stays inline button state ("Approve in wallet…"); a toast starts only once a signature exists. The toast viewport's `z-40` is the codebase's second and last z-index (the header is `z-30`; the dialog needs none). Kept separate from the wallet provider so 2-second poll ticks never re-render wallet consumers.
