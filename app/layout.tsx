import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TxProvider } from "@/components/tx/tx-provider";
import { WalletProvider } from "@/components/wallet/wallet-provider";
import { SITE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s — ${SITE.name}` },
  description: SITE.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* Neither provider renders an element of its own — body is a flex
          column whose children must stay the header, main and footer. The tx
          provider sits inside the wallet provider because its confirmation
          poll reads the endpoint from it. */}
      <body className="min-h-full flex flex-col font-sans">
        <WalletProvider>
          <TxProvider>{children}</TxProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
