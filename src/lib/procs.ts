import { DEFAULT_PROCS, MAX_ROWS } from "./constants.ts";
import type { Process } from "./types.ts";

/** Excel-style: 0→A … 25→Z, 26→AA, 27→AB … */
export function indexToLetterId(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function nextLetterId(processes: Process[]): string {
  const used = new Set(processes.map((p) => String(p.id).trim().toUpperCase()));
  for (let i = 0; i < MAX_ROWS + 26; i++) {
    const id = indexToLetterId(i);
    if (!used.has(id)) return id;
  }
  return indexToLetterId(processes.length);
}

export function procColorClass(id: string): string {
  const letters = String(id).trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (!letters) return "p1";
  // map A→1 … J→10, AA→1, etc. by last letter mostly for palette variety
  let hash = 0;
  for (let i = 0; i < letters.length; i++) hash = (hash * 26 + (letters.charCodeAt(i) - 64)) % 10;
  return "p" + (hash === 0 ? 10 : hash);
}

export function cloneProcList(rows: Process[]): Process[] {
  return rows.map((r) => ({
    id: r.id,
    arr: r.arr,
    burst: r.burst,
    pri: r.pri ?? 99,
    rem: r.burst,
  }));
}

function cascadeUniqueNumber(
  processes: Process[],
  editedIndex: number,
  field: "arr" | "pri",
  minValue: number,
): Process[] {
  const procs = processes.map((p) => ({ ...p }));
  let n = parseInt(String(procs[editedIndex][field]), 10);
  if (Number.isNaN(n) || n < minValue) n = minValue;
  procs[editedIndex] = { ...procs[editedIndex], [field]: n };

  function resolve(holderIdx: number, val: number): void {
    const others: number[] = [];
    for (let i = 0; i < procs.length; i++) {
      if (i !== holderIdx && procs[i][field] === val) others.push(i);
    }
    if (!others.length) return;
    const victim = others[others.length - 1];
    const next = val + 1;
    procs[victim] = { ...procs[victim], [field]: next };
    resolve(victim, next);
    resolve(holderIdx, val);
  }

  resolve(editedIndex, n);
  return procs;
}

/** Keep arrivals unique: edited row keeps its value; cascade others to next free times. */
export function cascadeUniqueArrival(processes: Process[], editedIndex: number): Process[] {
  return cascadeUniqueNumber(processes, editedIndex, "arr", 0);
}

/** Keep priorities unique and ≥ 1. */
export function cascadeUniquePriority(processes: Process[], editedIndex: number): Process[] {
  return cascadeUniqueNumber(processes, editedIndex, "pri", 1);
}

export function sanitizeArrival(raw: string | number): number {
  const cleaned = String(raw).replace(/[^\d]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

export function sanitizeBurst(raw: string | number): number {
  const cleaned = String(raw).replace(/[^\d]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) || n < 1 ? 1 : Math.min(n, 999);
}

export function sanitizePriority(raw: string | number): number {
  const cleaned = String(raw).replace(/[^\d]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) || n < 1 ? 1 : Math.min(n, 999);
}

export function nextFreePriority(processes: Process[]): number {
  const used = new Set(processes.map((p) => p.pri));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

export function createDefaultProcesses(count = 5): Process[] {
  return DEFAULT_PROCS.slice(0, count).map((p) => ({ ...p }));
}
