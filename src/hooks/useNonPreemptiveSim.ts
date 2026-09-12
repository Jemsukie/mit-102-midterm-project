import { useCallback, useMemo, useRef, useState } from "react";
import { MAX_ROWS } from "../lib/constants.ts";
import { buildNonPreemptiveLog } from "../lib/eventLog.ts";
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
import type {
  CompareCard,
  EventLogResult,
  NonPreemptiveAlgo,
  Process,
  ProcField,
} from "../lib/types.ts";
import { useLogWalkthrough, EMPTY_LOG_EVENTS } from "./useLogWalkthrough.ts";

export function useNonPreemptiveSim() {
  const [processes, setProcesses] = useState<Process[]>(() => createDefaultProcesses(5));
  const [algo, setAlgo] = useState<NonPreemptiveAlgo>("FCFS");
  const stateRef = useRef({ processes, algo });
  stateRef.current = { processes, algo };

  const eventLog = useMemo((): (EventLogResult & { title: string }) | null => {
    if (!processes.length) return null;
    const titles: Record<NonPreemptiveAlgo, string> = { FCFS: "FCFS", SJF: "SJF", PRI: "Priority" };
    const log = buildNonPreemptiveLog(processes, algo);
    return { ...log, title: (titles[algo] || algo) + " · Event Log" };
  }, [processes, algo]);

  const walk = useLogWalkthrough(eventLog?.events ?? EMPTY_LOG_EVENTS);

  const changeAlgo = useCallback((next: NonPreemptiveAlgo) => {
    setAlgo((prev) => (prev === next ? prev : next));
  }, []);

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

  const compare = useMemo((): CompareCard[] => {
    const algos: NonPreemptiveAlgo[] = ["FCFS", "SJF", "PRI"];
    if (!processes.length) {
      return algos.map((key) => ({ key, avgWt: null, avgTat: null, timeline: [] }));
    }
    return algos.map((key) => {
      const { timeline, avgWt, avgTat } = runFullSchedule(processes, key, 4);
      return { key, timeline, avgWt, avgTat };
    });
  }, [processes]);

  return {
    processes,
    algo,
    eventLog,
    compare,
    changeAlgo,
    addProcess,
    removeProcess,
    importProcesses,
    commitField,
    canAdd: processes.length < MAX_ROWS,
    canRemove: processes.length > 1,
    countLabel: `${processes.length} / ${MAX_ROWS}`,
    walk,
  };
}
