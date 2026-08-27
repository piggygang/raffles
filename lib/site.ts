export const SITE = {
  name: "Piggy Raffles",
  tagline: "Free raffles for the Piggy Gang — nobody ever pays to enter.",
} as const;

export type Social = {
  label: string;
  href: string;
  /** Key into ICONS in components/site-footer.tsx */
  icon: "x" | "discord" | "github";
};

// Mirrors ../website's footer — that repo is the source of truth for the
// org's social links (dressme still carries an older set).
export const SOCIALS: Social[] = [
  { label: "X", href: "https://x.com/PiggySolGang", icon: "x" },
  { label: "Discord", href: "https://discord.gg/8SjGR8Srvz", icon: "discord" },
  { label: "GitHub", href: "https://github.com/piggygang", icon: "github" },
];
