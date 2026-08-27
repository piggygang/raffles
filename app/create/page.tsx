import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteNav } from "@/components/site-nav";
import { ConnectButton } from "@/components/wallet/connect-button";

export const metadata: Metadata = { title: "Create" };

export default function CreatePage() {
  return (
    <>
      <SiteHeader>
        <SiteNav />
        <ConnectButton />
      </SiteHeader>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16 sm:pt-20">
          <p className="text-sm font-medium tracking-[0.14em] text-ink-muted uppercase">Create</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Give away a prize
          </h1>
          <p className="mt-4 max-w-md text-base text-ink-muted text-pretty">
            Raffle creation is restricted to the DAO and approved partners. The flow lands
            here: pick an allowlisted prize, set the terms, and escrow it in one transaction.
          </p>
          <span className="mt-6 inline-block rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-muted">
            Coming soon
          </span>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
