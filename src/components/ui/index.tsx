"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  if (!children) return null;
  return (
    <span
      id={htmlFor}
      className="block text-xs text-[var(--bt-muted)] mb-1.5 font-medium"
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
  const base = "bt-btn w-full disabled:cursor-not-allowed";
  const variants: Record<ButtonVariant, string> = {
    primary: "bt-btn-primary py-2.5",
    secondary: "bt-btn-secondary py-2",
    ghost: "bt-btn-ghost py-2",
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
      className="bt-btn-icon h-8 min-w-8 px-2 rounded-[var(--bt-radius-sm)] text-xs disabled:opacity-30"
      data-active={active ?? false}
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
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: ReactNode }[];
  compact?: boolean;
  hideLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuRect(null);
      return;
    }
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setMenuRect({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const menu =
    open && menuRect ? (
      <div
        ref={menuRef}
        className="bt-menu bt-menu-portal menu-in perpl-scroll"
        style={{
          top: menuRect.top,
          left: menuRect.left,
          width: menuRect.width,
        }}
        role="listbox"
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={o.value === value}
            data-active={o.value === value}
            className="bt-menu-item flex items-center gap-2"
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div ref={containerRef} className="relative">
      {!hideLabel && <FieldLabel>{label}</FieldLabel>}
      <button
        ref={triggerRef}
        type="button"
        data-open={open}
        onClick={() => setOpen((o) => !o)}
        className={`bt-trigger ${compact ? "!text-xs !h-8 !min-h-8" : ""}`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selected?.icon}
          <span className="truncate">{selected?.label ?? value}</span>
        </span>
        <Chevron open={open} />
      </button>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
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
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = useState({ left: 0, width: 0 });
  const [ready, setReady] = useState(false);
  const activeIndex = options.findIndex((o) => o.value === value);

  useLayoutEffect(() => {
    const update = () => {
      const track = trackRef.current;
      const btn = itemRefs.current[activeIndex];
      if (!track || !btn || activeIndex < 0) return;

      const trackRect = track.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setThumb({
        left: btnRect.left - trackRect.left,
        width: btnRect.width,
      });
      setReady(true);
    };

    update();
    const track = trackRef.current;
    if (!track) return;

    const ro = new ResizeObserver(update);
    ro.observe(track);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [activeIndex, options]);

  return (
    <div
      ref={trackRef}
      className="bt-segment-track"
      data-ready={ready}
      role="tablist"
    >
      <div
        className="bt-segment-thumb"
        aria-hidden
        style={{
          transform: `translateX(${thumb.left}px)`,
          width: thumb.width,
        }}
      />
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
          className="bt-segment-item"
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
      data-active={active ?? false}
      className={`bt-chip px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
        active
          ? "text-white"
          : "text-[var(--bt-muted)] hover:text-white"
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
          checked ? "bg-[var(--paper-7)] shadow-[var(--btn-metal)]" : "bg-[var(--paper-5)] shadow-[var(--surface-metal-recessed)]"
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
    error: "bg-red-500/10 text-[var(--bt-red)] border-transparent",
    info: "bg-[var(--paper-4)] text-[var(--bt-label)] border-transparent shadow-[var(--surface-metal-recessed)]",
    success: "bg-green-500/10 text-[var(--bt-green)] border-transparent",
  };
  return (
    <p className={`text-xs rounded-[var(--bt-radius-sm)] px-3 py-2 border overflow-scroll max-h-20 ${styles[variant]}`}>
      {children}
    </p>
  );
}

export function WalletPill({ address }: { address: string }) {
  return (
    <div className="bt-wallet-pill flex items-center justify-center gap-2 py-2 px-3 rounded-[var(--bt-radius-sm)]">
      <span className="w-2 h-2 rounded-full bg-[var(--bt-green)]" />
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
    muted: "bg-[var(--paper-4)] text-[var(--bt-muted)] border-transparent shadow-[var(--surface-metal-recessed)]",
    accent: "bg-[var(--paper-5)] text-[var(--bt-label)] border-transparent shadow-[var(--surface-metal-recessed)]",
    green: "bg-green-500/10 text-[var(--bt-green)] border-transparent",
    red: "bg-red-500/10 text-[var(--bt-red)] border-transparent",
    orange: "bg-orange-500/10 text-[var(--bt-orange)] border-transparent",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function AccordionGroup({ children }: { children: ReactNode }) {
  return <div className="w-full border-t border-white/[0.03]">{children}</div>;
}

export function Accordion({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="accordion" data-open={open}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="accordion-trigger"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white">{title}</p>
          {summary && (
            <p
              className={`text-[10px] text-[var(--bt-muted)] truncate mt-0.5 transition-all duration-200 ease-out ${
                open ? "max-h-0 opacity-0 mt-0" : "max-h-4 opacity-100"
              }`}
            >
              {summary}
            </p>
          )}
        </div>
        <Chevron open={open} />
      </button>
      <div className="accordion-panel" data-open={open}>
        <div className="accordion-panel-inner">
          <div className="accordion-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={`text-[var(--bt-muted)] shrink-0 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
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

export { DateInput } from "./DateInput";
