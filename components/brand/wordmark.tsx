import Link from "next/link";
import { SITE } from "@/lib/site";

export function PiggyMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
    >
      <path d="M11 17 L14 6 L23 12 Z" fill="var(--brand-strong)" />
      <path d="M37 17 L34 6 L25 12 Z" fill="var(--brand-strong)" />
      <ellipse cx="24" cy="27" rx="16" ry="14" fill="var(--brand)" />
      <ellipse cx="24" cy="31" rx="7" ry="5" fill="var(--brand-strong)" />
      <circle cx="21.5" cy="31" r="1.3" fill="#00000066" />
      <circle cx="26.5" cy="31" r="1.3" fill="#00000066" />
      <circle cx="17" cy="23" r="2.2" fill="#1f2937" />
      <circle cx="31" cy="23" r="2.2" fill="#1f2937" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className ?? ""}`}
      aria-label={`${SITE.name} — home`}
    >
      <PiggyMark className="h-8 w-8 transition-transform group-hover:-rotate-6" />
      <span className="text-lg font-semibold tracking-tight">
        Piggy <span className="text-brand">Raffles</span>
      </span>
    </Link>
  );
}
