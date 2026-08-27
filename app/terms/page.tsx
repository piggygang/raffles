import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteNav } from "@/components/site-nav";
import { ConnectButton } from "@/components/wallet/connect-button";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader>
        <SiteNav />
        <ConnectButton />
      </SiteHeader>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-16 sm:pt-20">
          <p className="text-sm font-medium tracking-[0.14em] text-ink-muted uppercase">Terms</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Terms of service
          </h1>
          <p className="mt-4 max-w-md text-base text-ink-muted text-pretty">
            The full terms and responsible-use notes are being finalised alongside the first
            raffles and land here before launch. The short version already holds: every raffle
            is free to enter, 18+, with published rules per raffle — you only ever pay network
            gas, and account rent comes back after a raffle settles.
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
