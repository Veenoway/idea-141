export function Footer() {
  return (
    <footer className="h-8 shrink-0 flex items-center justify-between px-4 border-t border-[var(--perpl-border)] bg-[var(--perpl-bg)] text-[11px] text-[var(--perpl-muted)]">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--perpl-green)]" />
        <span>Operational</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="hover:text-white cursor-default">Docs</span>
        <span className="hover:text-white cursor-default">Discord</span>
      </div>
    </footer>
  );
}
