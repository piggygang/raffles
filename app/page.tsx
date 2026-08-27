import { PiggyMark } from "@/components/brand/wordmark";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteNav } from "@/components/site-nav";
import { ConnectButton } from "@/components/wallet/connect-button";

export default function Home() {
  return (
    <>
      <SiteHeader>
        <SiteNav />
        <ConnectButton />
      </SiteHeader>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-5 pt-14 pb-12 text-center sm:pt-20">
          <PiggyMark className="mx-auto h-16 w-16" />
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Win prizes just for holding your piggies
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-ink-muted text-pretty sm:text-lg">
            Hold a piggy from any of the three collections and claim free raffle entries —
            prizes from the DAO and partners, winners drawn provably fair. Nobody ever pays to
            enter.
          </p>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-16">
          <h2 className="mb-4 text-sm font-medium tracking-[0.14em] text-ink-muted uppercase">
            Raffles
          </h2>
          <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line bg-surface/50 p-5">
            <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-muted">
              Coming soon
            </span>
            <p className="max-w-md text-sm text-ink-muted text-pretty">
              The first raffles land here with the beta: free entries for holders, capped per
              wallet, a Full Gang bonus for holding all three collections, and a public VRF
              proof behind every draw.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
