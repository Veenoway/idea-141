"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type ToastVariant = "error" | "success" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
  href?: string;
  hrefLabel?: string;
}

interface LoadingToastState {
  message: string;
  hint: string;
  elapsedMs: number;
}

interface ToastOptions {
  variant?: ToastVariant;
  action?: ToastAction;
  href?: string;
  hrefLabel?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: Omit<ToastOptions, "variant">) => string;
  success: (message: string, options?: Omit<ToastOptions, "variant">) => string;
  info: (message: string, options?: Omit<ToastOptions, "variant">) => string;
  dismiss: (id: string) => void;
  showLoading: (message: string, hint?: string) => void;
  updateLoading: (updates: Partial<LoadingToastState>) => void;
  hideLoading: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  error: 7000,
  success: 5000,
  info: 4500,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [loadingToast, setLoadingToast] = useState<LoadingToastState | null>(null);
  const idRef = useRef(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = `toast-${++idRef.current}`;
      const variant = options.variant ?? "info";
      const item: ToastItem = {
        id,
        message,
        variant,
        action: options.action,
        href: options.href,
        hrefLabel: options.hrefLabel,
      };

      setToasts((prev) => [...prev.slice(-4), item]);

      const duration = options.duration ?? DEFAULT_DURATION[variant];
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const showLoading = useCallback((message: string, hint = "") => {
    setLoadingToast({ message, hint, elapsedMs: 0 });
  }, []);

  const updateLoading = useCallback((updates: Partial<LoadingToastState>) => {
    setLoadingToast((prev) =>
      prev ? { ...prev, ...updates } : { message: "", hint: "", elapsedMs: 0, ...updates }
    );
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingToast(null);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      error: (message, options) => toast(message, { ...options, variant: "error" }),
      success: (message, options) => toast(message, { ...options, variant: "success" }),
      info: (message, options) => toast(message, { ...options, variant: "info" }),
      dismiss,
      showLoading,
      updateLoading,
      hideLoading,
    }),
    [toast, dismiss, showLoading, updateLoading, hideLoading]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster loadingToast={loadingToast} toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function Toaster({
  loadingToast,
  toasts,
  onDismiss,
}: {
  loadingToast: LoadingToastState | null;
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (typeof document === "undefined") return null;
  if (!loadingToast && toasts.length === 0) return null;

  return createPortal(
    <div className="bt-toast-stack" aria-live="polite" aria-relevant="additions">
      {loadingToast && <LoadingToastCard toast={loadingToast} />}
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>,
    document.body
  );
}

function LoadingToastCard({ toast }: { toast: LoadingToastState }) {
  const seconds = (toast.elapsedMs / 1000).toFixed(1);

  return (
    <div className="bt-toast bt-toast-loading" role="status" aria-busy="true">
      <ToastSpinner />
      <div className="bt-toast-body">
        <p className="bt-toast-message">{toast.message}</p>
        {toast.hint && <p className="bt-toast-hint">{toast.hint}</p>}
        <div className="bt-toast-progress">
          <div className="bt-toast-progress-bar" />
        </div>
        <p className="bt-toast-elapsed tabular-nums">{seconds}s</p>
      </div>
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  return (
    <div className="bt-toast" data-variant={toast.variant} role="status">
      <div className="bt-toast-accent" aria-hidden />
      <div className="bt-toast-body">
        <p className="bt-toast-message">{toast.message}</p>
        {(toast.action || toast.href) && (
          <div className="bt-toast-actions">
            {toast.action && (
              <button type="button" className="bt-toast-action" onClick={toast.action.onClick}>
                {toast.action.label}
              </button>
            )}
            {toast.href && (
              <a
                href={toast.href}
                target="_blank"
                rel="noreferrer"
                className="bt-toast-action"
              >
                {toast.hrefLabel ?? "View"}
              </a>
            )}
          </div>
        )}
      </div>
      <button type="button" className="bt-toast-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

function ToastSpinner() {
  return (
    <div className="bt-toast-spinner" aria-hidden>
      <div className="bt-toast-spinner-ring" />
      <div className="bt-toast-spinner-ring bt-toast-spinner-ring--active" />
    </div>
  );
}
