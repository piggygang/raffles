import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteNav } from "@/components/site-nav";
import { ConnectButton } from "@/components/wallet/connect-button";
import { DevWallet } from "./dev-wallet";

/** A hand-testing harness, not a destination — kept out of every index. */
export const metadata: Metadata = {
  title: "Wallet test",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <SiteHeader>
        <SiteNav />
        <ConnectButton />
      </SiteHeader>

      <main className="flex-1">
        <DevWallet />
      </main>

      <SiteFooter />
    </>
  );
}
