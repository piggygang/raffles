import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Wordmark />
        {children}
      </div>
    </header>
  );
}
