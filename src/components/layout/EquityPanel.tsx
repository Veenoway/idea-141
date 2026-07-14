"use client";

import { EquityChart } from "@/components/charts";

interface Props {
  equity: { time: number; equity: number }[];
  sliceEnd?: number;
  sliceStart?: number;
}

export function EquityPanel({ equity, sliceEnd, sliceStart = 0 }: Props) {
  return (
    <section className="bt-main-panel p-3 shrink-0">
      <div className="h-[180px] bt-chart-well">
        <EquityChart equity={equity} sliceEnd={sliceEnd} sliceStart={sliceStart} />
      </div>
    </section>
  );
}
