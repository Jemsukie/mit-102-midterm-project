import { useCallback, useMemo, useRef, useState } from "react";
import { MAX_ROWS } from "../lib/constants.ts";
import { buildRoundRobinLog } from "../lib/eventLog.ts";
import {
  cascadeUniqueArrival,
  cascadeUniquePriority,
  createDefaultProcesses,
  nextFreePriority,
  nextLetterId,
  sanitizeArrival,
  sanitizeBurst,
  sanitizePriority,
} from "../lib/procs.ts";
import { runFullSchedule } from "../lib/schedule.ts";
import type { EventLogResult, Process, ProcField, ScheduleMetrics } from "../lib/types.ts";
import { useLogWalkthrough, EMPTY_LOG_EVENTS } from "./useLogWalkthrough.ts";

export function useRoundRobinSim() {
  const [processes, setProcesses] = useState<Process[]>(() => createDefaultProcesses(5));
  const [quantumInput, setQuantumInput] = useState<number | "">(4);
  const stateRef = useRef({ processes });
  stateRef.current = { processes };

  const quantum =
    Number.isNaN(Number(quantumInput)) || Number(quantumInput) < 1 ? 4 : Number(quantumInput);

  const eventLog = useMemo((): (EventLogResult & { title: string }) | null => {
    if (!processes.length) return null;
    const log = buildRoundRobinLog(processes, quantum);
    return { ...log, title: "Round Robin · Event Log" };
  }, [processes, quantum]);

  const walk = useLogWalkthrough(eventLog?.events ?? EMPTY_LOG_EVENTS);

  const replaceProcesses = useCallback((next: Process[]) => {
    setProcesses(next);
  }, []);

  const addProcess = useCallback(() => {
    const prev = stateRef.current.processes;
    if (prev.length >= MAX_ROWS) return;
    const lastArr = prev.at(-1)?.arr ?? -1;
    replaceProcesses([
      ...prev,
      {
        id: nextLetterId(prev),
        arr: lastArr + 1,
        burst: 1,
        pri: nextFreePriority(prev),
      },
    ]);
  }, [replaceProcesses]);

  const removeProcess = useCallback(() => {
    const prev = stateRef.current.processes;
    if (prev.length <= 1) return;
    replaceProcesses(prev.slice(0, -1));
  }, [replaceProcesses]);

  const importProcesses = useCallback(
    (next: Process[]) => {
      replaceProcesses(next);
    },
    [replaceProcesses],
  );

  const commitField = useCallback(
    (index: number, field: ProcField, raw: string) => {
      const prev = stateRef.current.processes;
      let next: Process[];
      if (field === "arr") {
        const cleaned = sanitizeArrival(raw);
        const withVal = prev.map((p, i) => (i === index ? { ...p, arr: cleaned } : p));
        next = cascadeUniqueArrival(withVal, index);
      } else if (field === "burst") {
        const n = sanitizeBurst(raw);
        next = prev.map((p, i) => (i === index ? { ...p, burst: n } : p));
      } else if (field === "pri") {
        const cleaned = sanitizePriority(raw);
        const withVal = prev.map((p, i) => (i === index ? { ...p, pri: cleaned } : p));
        next = cascadeUniquePriority(withVal, index);
      } else {
        return;
      }
      replaceProcesses(next);
    },
    [replaceProcesses],
  );

  const commitQuantum = useCallback((raw: string) => {
    let q = parseInt(raw, 10);
    if (Number.isNaN(q) || q < 1) q = 4;
    setQuantumInput(q);
  }, []);

  const calc = useMemo((): {
    metrics: ScheduleMetrics[];
    avgWt: number | null;
    avgTat: number | null;
  } => {
    if (!processes.length) {
      return { metrics: [], avgWt: null, avgTat: null };
    }
    const { metrics, avgWt, avgTat } = runFullSchedule(processes, "RR", quantum);
    return { metrics, avgWt, avgTat };
  }, [processes, quantum]);

  return {
    processes,
    quantum,
    quantumInput,
    setQuantumInput,
    eventLog,
    calc,
    addProcess,
    removeProcess,
    importProcesses,
    commitField,
    commitQuantum,
    canAdd: processes.length < MAX_ROWS,
    canRemove: processes.length > 1,
    countLabel: `${processes.length} / ${MAX_ROWS}`,
    walk,
  };
}
