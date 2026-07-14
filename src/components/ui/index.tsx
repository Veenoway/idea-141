"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  if (!children) return null;
  return (
    <span
      id={htmlFor}
      className="block text-[10px] uppercase tracking-wider text-[var(--bt-muted)] mb-1.5 font-medium"
    >
      {children}
    </span>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-[var(--bt-muted)] mb-2.5 font-semibold">
      {children}
    </p>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`bt-panel ${className}`}>{children}</div>;
}

type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  className?: string;
  type?: "button" | "submit";
}) {
  const base =
    "w-full rounded-[var(--bt-radius-sm)] text-sm font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  const variants: Record<ButtonVariant, string> = {
    primary:
      "py-2.5 bg-[var(--bt-accent)] text-white hover:brightness-110 active:scale-[0.99] shadow-[0_4px_20px_rgba(131,110,249,0.25)]",
    secondary:
      "py-2 border border-[var(--bt-border-strong)] text-[var(--bt-label)] hover:text-white hover:bg-[var(--bt-card-hover)] hover:border-white/20",
    ghost:
      "py-2 text-[var(--bt-muted)] hover:text-white hover:bg-white/[0.04]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  disabled,
  active,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`h-8 min-w-8 px-2 rounded-[var(--bt-radius-sm)] text-xs border transition-all ${
        active
          ? "border-[var(--bt-accent)] bg-[var(--bt-accent-dim)] text-white"
          : "border-[var(--bt-border)] text-[var(--bt-muted)] hover:text-white hover:bg-[var(--bt-card-hover)] hover:border-[var(--bt-border-strong)]"
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId();
  return (
    <label className="block">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="bt-input tabular-nums"
      />
    </label>
  );
}

export function NumInput({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <label className="block">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bt-input tabular-nums"
      />
    </label>
  );
}

export function SelectMenu({
  label,
  value,
  onChange,
  options,
  compact,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <FieldLabel>{label}</FieldLabel>
      <button
        type="button"
        data-open={open}
        onClick={() => setOpen((o) => !o)}
        className={`bt-trigger ${compact ? "!py-1.5 !text-xs !min-h-8" : ""}`}
      >
        <span>{selected}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="bt-menu menu-in perpl-scroll" role="listbox">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              data-active={o.value === value}
              className="bt-menu-item"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex p-1 rounded-[var(--bt-radius-sm)] bg-[var(--bt-input)] border border-[var(--bt-border)]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
            value === o.value
              ? "bg-[var(--bt-card)] text-white shadow-sm border border-[var(--bt-border-strong)]"
              : "text-[var(--bt-muted)] hover:text-[var(--bt-label)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
        active
          ? "border-[var(--bt-accent)] text-white bg-[var(--bt-accent-dim)] shadow-[0_0_12px_rgba(131,110,249,0.15)]"
          : "border-[var(--bt-border)] text-[var(--bt-muted)] hover:text-white hover:border-[var(--bt-border-strong)] hover:bg-[var(--bt-card-hover)]"
      }`}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group mt-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? "bg-[var(--bt-accent)]" : "bg-[var(--bt-input)] border border-[var(--bt-border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-xs text-[var(--bt-label)] group-hover:text-white transition-colors">
        {label}
      </span>
    </label>
  );
}

export function Alert({
  children,
  variant = "error",
}: {
  children: ReactNode;
  variant?: "error" | "info" | "success";
}) {
  const styles = {
    error: "bg-red-500/10 border-red-500/20 text-[var(--bt-red)]",
    info: "bg-[var(--bt-accent-dim)] border-[var(--bt-accent)]/20 text-[var(--bt-label)]",
    success: "bg-green-500/10 border-green-500/20 text-[var(--bt-green)]",
  };
  return (
    <p className={`text-xs rounded-[var(--bt-radius-sm)] px-3 py-2 border ${styles[variant]}`}>
      {children}
    </p>
  );
}

export function WalletPill({ address }: { address: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-[var(--bt-radius-sm)] bg-[var(--bt-input)] border border-[var(--bt-border)]">
      <span className="w-2 h-2 rounded-full bg-[var(--bt-green)] shadow-[0_0_8px_var(--bt-green)]" />
      <span className="text-xs text-[var(--bt-label)] tabular-nums font-medium">
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
    </div>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "green" | "red" | "orange";
}) {
  const tones = {
    muted: "bg-[var(--bt-input)] text-[var(--bt-muted)] border-[var(--bt-border)]",
    accent: "bg-[var(--bt-accent-dim)] text-[var(--bt-accent)] border-[var(--bt-accent)]/25",
    green: "bg-green-500/10 text-[var(--bt-green)] border-green-500/20",
    red: "bg-red-500/10 text-[var(--bt-red)] border-red-500/20",
    orange: "bg-orange-500/10 text-[var(--bt-orange)] border-orange-500/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={`text-[var(--bt-muted)] transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
