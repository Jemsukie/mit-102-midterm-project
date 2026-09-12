import type { NonPreemptiveAlgo, Process } from "./types.ts";

export const SIM_ICON = {
  prev: "⏮",
  step: "⏭",
  play: "▶",
  pause: "⏸",
  reset: "↺",
} as const;

export const DEFAULT_PROCS: Process[] = [
  { id: "A", arr: 0, burst: 8, pri: 2 },
  { id: "B", arr: 1, burst: 4, pri: 3 },
  { id: "C", arr: 2, burst: 9, pri: 1 },
  { id: "D", arr: 3, burst: 5, pri: 4 },
  { id: "E", arr: 4, burst: 2, pri: 5 },
];

export const LETTERS = "ABCDEFGHIJ".split("");

export const MAX_ROWS = 10;

export const ALGO_LABELS: Record<NonPreemptiveAlgo, string> = {
  FCFS: "FCFS",
  SJF: "SJF",
  PRI: "Priority",
};
