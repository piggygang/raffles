"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Raffles" },
  { href: "/create", label: "Create" },
  { href: "/me", label: "My raffles" },
  { href: "/winners", label: "Winners" },
] as const;

/**
 * The header nav. A client component only for the active state — matching on
 * the pathname beats threading an "active" prop through every page.
 */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="no-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 sm:justify-center"
    >
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              active ? "bg-surface-raised text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
