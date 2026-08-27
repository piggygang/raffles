import { CLUSTER, CLUSTER_DEFAULT_ENDPOINT } from "@/lib/cluster";

/**
 * Cluster-scoped: a localhost or free-tier devnet override must not survive a
 * flip to mainnet-beta (or vice versa) — an endpoint on the wrong cluster
 * fails in the most confusing way possible, at blockhash time.
 */
const KEY = `piggy.rpc-endpoint.${CLUSTER}`;

export const DEFAULT_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? CLUSTER_DEFAULT_ENDPOINT;

export function isValidEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function readOverride(): string {
  // localStorage throws outright when the browser blocks storage, rather than
  // returning null, so every access is guarded.
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeOverride(value: string): void {
  try {
    if (value) window.localStorage.setItem(KEY, value);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* A holder who blocks storage just falls back to the default. */
  }
}
