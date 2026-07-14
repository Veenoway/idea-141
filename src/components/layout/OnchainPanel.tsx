"use client";

import { explorerTxUrl } from "@/lib/chain";
import { shortHash } from "@/lib/commit-hash";
import { Alert, Badge, Panel, WalletPill } from "@/components/ui";

export type CommitStatus = "idle" | "committing" | "success" | "error";

interface Props {
  status: CommitStatus;
  configHash?: string;
  resultHash?: string;
  commitId?: string | null;
  txHash?: string | null;
  error?: string | null;
  walletAddress?: string | null;
}

export function OnchainPanel({
  status,
  configHash,
  resultHash,
  commitId,
  txHash,
  error,
  walletAddress,
}: Props) {
  return (
    <div className="shrink-0 p-4 border-b border-[var(--bt-border)] bg-[var(--bt-bg)]">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h2 className="text-sm font-medium text-[var(--bt-label)]">Onchain Attestation</h2>
          <p className="text-[11px] text-[var(--bt-muted)] mt-1">
            Results are committed on Monad Mainnet after each backtest
          </p>
        </div>
        {walletAddress && <WalletPill address={walletAddress} />}
      </div>

      <Panel className="p-4 space-y-3">
        {configHash && resultHash && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <HashRow label="Config hash" value={shortHash(configHash)} />
            <HashRow label="Result hash" value={shortHash(resultHash)} />
          </div>
        )}

        {status === "committing" && (
          <Alert variant="info">Committing on Monad… confirm in your wallet</Alert>
        )}

        {status === "success" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone="green">Committed</Badge>
              {commitId && <span className="text-xs text-[var(--bt-muted)]">#{commitId}</span>}
            </div>
            {txHash && (
              <a
                href={explorerTxUrl(txHash)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--bt-accent)] hover:underline break-all"
              >
                View transaction →
              </a>
            )}
          </div>
        )}

        {status === "error" && error && <Alert variant="error">{error}</Alert>}

        {status === "idle" && !configHash && (
          <p className="text-xs text-[var(--bt-muted)]">
            Run a backtest to commit the result fingerprint onchain.
          </p>
        )}
      </Panel>
    </div>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--bt-radius-sm)] border border-[var(--bt-border)] bg-[var(--bt-input)] px-3 py-2">
      <p className="text-[var(--bt-muted)] text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-white font-mono mt-1 text-xs">{value}</p>
    </div>
  );
}
