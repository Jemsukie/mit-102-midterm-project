import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import type { CompareCard, NonPreemptiveAlgo } from "../lib/types.ts";
import { GanttBar } from "./GanttBar.tsx";

interface ColDef {
  key: NonPreemptiveAlgo;
  id: string;
  label: string;
  bad: boolean;
  extra?: ReactNode;
}

const COLS: ColDef[] = [
  { key: "FCFS", id: "fcfs", label: "FCFS", bad: true },
  {
    key: "SJF",
    id: "sjf",
    label: "SJF",
    bad: false,
    extra: (
      <>
        · <span style={{ color: "var(--orange)" }}>shortest burst</span>
      </>
    ),
  },
  { key: "PRI", id: "pri", label: "Priority", bad: true },
];

interface AlgoCompareCardsProps {
  compare: CompareCard[];
  algo: NonPreemptiveAlgo;
  onSelect: (key: NonPreemptiveAlgo) => void;
}

export function AlgoCompareCards({
  compare,
  algo,
  onSelect,
}: AlgoCompareCardsProps) {
  return (
    <div className="sim-calc-panel">
      <div className="sim-algo-compare">
        {COLS.map((col) => {
          const data = compare.find((c) => c.key === col.key);
          const active = algo === col.key;
          const tag = active ? "↳ selected · drives event log" : "";
          const wt = data?.avgWt == null ? "—" : data.avgWt.toFixed(2);
          const tat = data?.avgTat == null ? "—" : data.avgTat.toFixed(2);
          return (
            <div
              key={col.key}
              className={`sim-algo-col${active ? " active" : ""}`}
              role="button"
              tabIndex={0}
              title={`Select ${col.label}`}
              onClick={(e: MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
                onSelect(col.key);
              }}
              onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(col.key);
                }
              }}
            >
              <p className="sim-algo-tag">{tag}</p>
              <p className="meta">
                {col.label} {col.extra || null}
                {" · avg WT "}
                <span className={`stat${col.bad ? " bad" : ""}`}>{wt}</span>
                {" · TAT "}
                <span className={`stat${col.bad ? " bad" : ""}`}>{tat}</span>
              </p>
              <GanttBar timeline={data?.timeline || []} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
