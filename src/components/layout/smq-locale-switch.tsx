"use client";

import { cn } from "@/lib/utils";
import { useSmqLocale } from "@/hooks/use-smq-locale";
import type { SmqLocale } from "@/lib/smq-i18n";

const OPTIONS: { id: SmqLocale; label: string }[] = [
  { id: "fr", label: "FR" },
  { id: "en", label: "EN" },
];

export function SmqLocaleSwitch({
  className,
  variant = "light",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const { locale, setLocale } = useSmqLocale();

  return (
    <div
      className={cn(
        "inline-flex rounded-full border p-0.5 text-[11px] font-semibold",
        variant === "dark"
          ? "border-white/20 bg-white/10"
          : "border-line bg-surface",
        className,
      )}
      role="group"
      aria-label="Langue / Language"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setLocale(opt.id)}
          className={cn(
            "cursor-pointer rounded-full px-2.5 py-1 transition-colors",
            locale === opt.id
              ? variant === "dark"
                ? "bg-white text-ink"
                : "bg-ink text-paper"
              : variant === "dark"
                ? "text-[#C9C4B4] hover:text-white"
                : "text-muted hover:text-ink",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
