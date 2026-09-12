import { DEFAULT_PROCS } from "./constants.ts";
import type { Process } from "./types.ts";

export function nextLetterId(processes: Process[]): string {
  const LETTERS = "ABCDEFGHIJ".split("");
  const used = new Set(processes.map((p) => String(p.id).trim().toUpperCase()));
  return LETTERS.find((L) => !used.has(L)) || ("X" + (processes.length + 1));
}

export function procColorClass(id: string): string {
  const digits = parseInt(String(id).replace(/\D/g, ""), 10);
  if (Number.isFinite(digits) && digits > 0) return "p" + Math.min(digits, 10);
  const ch = String(id).trim().toUpperCase().charCodeAt(0);
  if (ch >= 65 && ch <= 74) return "p" + (ch - 64);
  return "p1";
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

/** Keep arrivals unique: edited row keeps its value; last other row with the same
 *  arrival is cleared then set to next (n+1), cascading while collisions remain. */
export function cascadeUniqueArrival(processes: Process[], editedIndex: number): Process[] {
  const procs = processes.map((p) => ({ ...p }));
  let n = parseInt(String(procs[editedIndex].arr), 10);
  if (Number.isNaN(n) || n < 0) {
    n = 0;
  }
  procs[editedIndex] = { ...procs[editedIndex], arr: n };

  function resolve(holderIdx: number, val: number): void {
    const others: number[] = [];
    for (let i = 0; i < procs.length; i++) {
      if (i !== holderIdx && procs[i].arr === val) others.push(i);
    }
    if (!others.length) return;
    const victim = others[others.length - 1];
    const next = val + 1;
    procs[victim] = { ...procs[victim], arr: next };
    resolve(victim, next);
    resolve(holderIdx, val);
  }

  resolve(editedIndex, n);
  return procs;
}

export function sanitizeArrival(raw: string | number): number {
  const cleaned = String(raw).replace(/[^\d]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

export function createDefaultProcesses(count = 5): Process[] {
  return DEFAULT_PROCS.slice(0, count).map((p) => ({ ...p }));
}
