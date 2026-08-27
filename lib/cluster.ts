/**
 * Which Solana cluster this build talks to. Set at build time via
 * NEXT_PUBLIC_SOLANA_CLUSTER; unset means devnet, because failing toward the
 * cluster where transactions cost nothing is the only safe default. A value
 * that is set but unrecognised throws instead — a typo like "mainnet" must
 * break the build, not silently ship a devnet app to production.
 */
export type Cluster = "devnet" | "mainnet-beta";
export type SolanaChain = "solana:devnet" | "solana:mainnet";

const raw = process.env.NEXT_PUBLIC_SOLANA_CLUSTER;
if (raw !== undefined && raw !== "" && raw !== "devnet" && raw !== "mainnet-beta") {
  throw new Error(`NEXT_PUBLIC_SOLANA_CLUSTER must be "devnet" or "mainnet-beta", got "${raw}"`);
}
export const CLUSTER: Cluster = raw === "mainnet-beta" ? "mainnet-beta" : "devnet";

/**
 * The Wallet Standard chain identifier. Note the vocabulary mismatch with the
 * RPC world: the standard names mainnet "solana:mainnet", never
 * "solana:mainnet-beta".
 */
export const CHAIN: SolanaChain = CLUSTER === "mainnet-beta" ? "solana:mainnet" : "solana:devnet";

/**
 * Per-cluster shipped endpoints, so the app works with no environment at all;
 * NEXT_PUBLIC_SOLANA_RPC_URL overrides in lib/rpc-endpoint.ts. The mainnet
 * default is the same provider-restricted Helius endpoint dressme ships.
 */
export const CLUSTER_DEFAULT_ENDPOINT =
  CLUSTER === "mainnet-beta"
    ? "https://sissy-c5ed1o-fast-mainnet.helius-rpc.com"
    : "https://api.devnet.solana.com";

// Solana Explorer defaults to mainnet, so only devnet needs the param.
const EXPLORER_SUFFIX = CLUSTER === "mainnet-beta" ? "" : "?cluster=devnet";

export const explorerTxUrl = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}${EXPLORER_SUFFIX}`;

export const explorerAddressUrl = (address: string) =>
  `https://explorer.solana.com/address/${address}${EXPLORER_SUFFIX}`;
