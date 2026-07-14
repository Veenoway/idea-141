"use client";

import { Panel } from "@/components/ui";
import { EquityChart } from "@/components/charts";

interface Props {
  equity: { time: number; equity: number }[];
  sliceEnd?: number;
}

export function EquityPanel({ equity, sliceEnd }: Props) {
  return (
    <div className="shrink-0 p-4 border-b border-[var(--bt-border)] bg-[var(--bt-bg)]">
      <h2 className="text-sm font-medium text-[var(--bt-label)] mb-3">Equity Curve</h2>
      <Panel className="h-[180px] p-2">
        <EquityChart equity={equity} sliceEnd={sliceEnd} />
      </Panel>
    </div>
  );
}
