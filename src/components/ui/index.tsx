"use client";

import type { LucideIcon } from "lucide-react";
import { SmqPageHeader } from "@/components/layout/smq-page-header";
import { STATUT_COLOR } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusStamp({ label, className }: { label: string; className?: string }) {
  const color = STATUT_COLOR[label] ?? "#33566C";

  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border-[1.5px] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide sm:gap-1.5 sm:px-2.5 sm:text-[11px]",
        className,
      )}
      style={{ color, borderColor: color, backgroundColor: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate">{label}</span>
    </span>
  );
}

/** @deprecated Préférer SmqPageHeader — conservé pour compatibilité. */
export function DocHeader({
  code,
  title,
  sub,
  actions,
}: {
  code?: string;
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  return <SmqPageHeader title={title} sub={sub} code={code} actions={actions} />;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-muted">
      {label}
      {children}
    </label>
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | string[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("input-base", className)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function Btn({
  children,
  onClick,
  kind = "primary",
  className,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const kinds = {
    primary: "bg-ink text-paper border-ink",
    ghost: "bg-transparent text-ink border-line",
    danger: "bg-transparent text-rust border-rust/40",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border-[1.5px] px-3.5 py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-60",
        kinds[kind],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="rounded-[10px] border-[1.5px] border-dashed border-line px-5 py-10 text-center text-muted-light">
      <Icon className="mx-auto mb-2 opacity-60" size={22} />
      <p className="text-[13.5px]">{text}</p>
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn("input-base", className)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="input-base min-h-[55px] resize-y"
    />
  );
}

export function LoadingState({
  text = "Chargement des données…",
  error,
  onRetry,
}: {
  text?: string;
  error?: string | null;
  onRetry?: () => void;
}) {
  if (error) {
    return (
      <div className="rounded-[10px] border-[1.5px] border-rust/40 bg-surface p-5 text-sm text-rust">
        <p>{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 cursor-pointer font-semibold underline"
          >
            Réessayer
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-muted-light">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" />
      {text}
    </div>
  );
}
