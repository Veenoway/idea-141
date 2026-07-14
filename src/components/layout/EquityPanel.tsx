"use client";

import { EquityChart } from "@/components/charts";

interface Props {
  equity: { time: number; equity: number }[];
  sliceEnd?: number;
}

export function EquityPanel({ equity, sliceEnd }: Props) {
  return (
    <section className="bt-main-panel p-3 shrink-0">
      <div className="h-[180px] bt-chart-well">
        <EquityChart equity={equity} sliceEnd={sliceEnd} />
      </div>
    </section>
  );
}
