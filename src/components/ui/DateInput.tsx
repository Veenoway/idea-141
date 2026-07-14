"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = Array.from({ length: startPad }, () => null);
  for (let d = 1; d <= lastDay; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function isDisabled(day: Date, min?: string, max?: string): boolean {
  const iso = formatIsoDate(day);
  if (min && iso < min) return true;
  if (max && iso > max) return true;
  return false;
}

export function DateInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => parseIsoDate(value));
  const [menuRect, setMenuRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuRect(null);
      return;
    }
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const calendarWidth = 280;
      let left = rect.left;
      if (left + calendarWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - calendarWidth - 8);
      }
      setMenuRect({
        top: rect.bottom + 6,
        left,
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
    setViewMonth(parseIsoDate(value));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        calendarRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const selected = parseIsoDate(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = getCalendarDays(viewMonth.getFullYear(), viewMonth.getMonth());
  const monthLabel = viewMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const calendar =
    open && menuRect ? (
      <div
        ref={calendarRef}
        className="bt-calendar bt-menu-portal menu-in"
        style={{ top: menuRect.top, left: menuRect.left }}
        role="dialog"
        aria-label={`${label} calendar`}
      >
        <div className="bt-calendar-header">
          <button
            type="button"
            className="bt-calendar-nav"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            <NavChevron dir="left" />
          </button>
          <span className="bt-calendar-title">{monthLabel}</span>
          <button
            type="button"
            className="bt-calendar-nav"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
          >
            <NavChevron dir="right" />
          </button>
        </div>

        <div className="bt-calendar-weekdays">
          {WEEKDAYS.map((d) => (
            <span key={d} className="bt-calendar-weekday">
              {d}
            </span>
          ))}
        </div>

        <div className="bt-calendar-grid" role="grid">
          {days.map((day, i) =>
            day ? (
              <button
                key={formatIsoDate(day)}
                type="button"
                role="gridcell"
                disabled={isDisabled(day, min, max)}
                data-selected={isSameDay(day, selected)}
                data-today={isSameDay(day, today)}
                className="bt-calendar-day tabular-nums"
                onClick={() => {
                  onChange(formatIsoDate(day));
                  setOpen(false);
                }}
              >
                {day.getDate()}
              </button>
            ) : (
              <span key={`pad-${i}`} className="bt-calendar-day-pad" aria-hidden />
            )
          )}
        </div>
      </div>
    ) : null;

  return (
    <div ref={containerRef} className="relative">
      <DateFieldLabel>{label}</DateFieldLabel>
      <button
        ref={triggerRef}
        type="button"
        data-open={open}
        onClick={() => setOpen((o) => !o)}
        className="bt-trigger"
      >
        <span className="flex items-center gap-2 min-w-0 truncate tabular-nums">
          <CalendarIcon />
          <span className="truncate">{formatDisplay(value)}</span>
        </span>
        <Chevron open={open} />
      </button>
      {typeof document !== "undefined" && calendar
        ? createPortal(calendar, document.body)
        : null}
    </div>
  );
}

function DateFieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="block text-xs text-[var(--bt-muted)] mb-1.5 font-medium">
      {children}
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className="text-[var(--bt-muted)] shrink-0"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function NavChevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
      aria-hidden
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
