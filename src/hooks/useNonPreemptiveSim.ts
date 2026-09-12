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
import {
  fullRunOrder,
  pushIfChanged,
  runFullSchedule,
  sortReadyQueue,
} from "../lib/schedule.ts";
import type {
  CompareCard,
  EventLogResult,
  FlipOpts,
  NonPreemptiveAlgo,
  Process,
  ProcField,
} from "../lib/types.ts";
import { usePlayPause } from "./usePlayPause.ts";

const IDLE_MSG =
  "Step once per arrival. First arrival grabs the CPU if idle; later arrivals wait in the ready queue.";

interface Snap {
  time: number;
  arrivalStep: number;
  admitted: string[];
  running: string | null;
  queue: string[];
}

interface SimState {
  processes: Process[];
  algo: NonPreemptiveAlgo;
  time: number;
  arrivalStep: number;
  admitted: Set<string>;
  running: Process | null;
  queue: Process[];
}

function formatQueueLog(queue: Process[], algo: NonPreemptiveAlgo): string {
  if (algo === "SJF") return queue.map((p) => `${p.id}(${p.burst})`).join(" → ");
  if (algo === "PRI") return queue.map((p) => `${p.id}(pri ${p.pri})`).join(" → ");
  return queue.map((p) => p.id).join(" → ");
}

function queueChipSub(p: Process, algo: NonPreemptiveAlgo): string {
  if (algo === "SJF") return `burst ${p.burst}`;
  if (algo === "PRI") return `pri ${p.pri}`;
  return `arr ${p.arr}`;
}

function sortRuleText(algo: NonPreemptiveAlgo): string {
  if (algo === "SJF") return "On CPU = running now (not in queue). SJF sorts only waiting jobs by burst.";
  if (algo === "PRI") return "On CPU = running now. Priority sorts only waiting jobs by rank (1 = highest).";
  return "On CPU = running now. FCFS sorts only waiting jobs by arrival time.";
}

function explainStep(
  algo: NonPreemptiveAlgo,
  arrived: Process,
  dispatched: boolean,
  preOrder: string,
  postOrder: string,
  time: number,
  running: Process | null,
  queue: Process[],
): string {
  if (dispatched) {
    const extra =
      algo === "SJF" ? ` (burst ${arrived.burst})` : algo === "PRI" ? ` (priority ${arrived.pri})` : "";
    return (
      `${arrived.id} arrived at t=${time}${extra}. CPU was idle → dispatched immediately (non-preemptive). ` +
      `${arrived.id} is on CPU; ready queue empty. First arrival always runs first.`
    );
  }

  if (running) {
    const runNote = `${running.id} has been on CPU since t=${running.arr} and stays there (non-preemptive).`;
    if (queue.length === 1) {
      return `${arrived.id} arrived at t=${time}. ${runNote} ${arrived.id} waits alone in the ready queue.`;
    }
    if (algo === "SJF") {
      const burstList = queue.map((p) => `${p.id}=${p.burst}`).join(", ");
      const head = queue[0];
      const reorder =
        preOrder !== postOrder
          ? ` Re-sorted waiting jobs: was ${preOrder || "(empty)"} → ${postOrder}.`
          : " Queue order unchanged.";
      return (
        `${arrived.id} arrived (burst ${arrived.burst}). ${runNote}${reorder} ` +
        `Among waiting jobs (${burstList}), ${head.id} would run next (shortest burst ${head.burst}).`
      );
    }
    if (algo === "PRI") {
      const head = queue[0];
      const reorder = preOrder !== postOrder ? ` Re-sorted → ${postOrder}.` : "";
      return (
        `${arrived.id} arrived (priority ${arrived.pri}). ${runNote}${reorder} ` +
        `Best rank among waiting: ${head.id} (pri ${head.pri}).`
      );
    }
    const reorder = preOrder !== postOrder ? ` Re-sorted → ${postOrder}.` : "";
    return `${arrived.id} arrived at t=${time}. ${runNote}${reorder} Waiting in arrival order: ${postOrder}.`;
  }

  return `${arrived.id} arrived at t=${time}.`;
}

function initialSnap(): Snap {
  return {
    time: 0,
    arrivalStep: 0,
    admitted: [],
    running: null,
    queue: [],
  };
}

export function useNonPreemptiveSim() {
  const [processes, setProcesses] = useState<Process[]>(() => createDefaultProcesses(5));
  const [algo, setAlgo] = useState<NonPreemptiveAlgo>("FCFS");
  const [time, setTime] = useState(0);
  const [arrivalStep, setArrivalStep] = useState(0);
  const [admitted, setAdmitted] = useState(() => new Set<string>());
  const [running, setRunning] = useState<Process | null>(null);
  const [queue, setQueue] = useState<Process[]>([]);
  const [logMsg, setLogMsg] = useState(IDLE_MSG);
  const [flash, setFlash] = useState(0);
  const [tick, setTick] = useState(0);
  const [showLogs, setShowLogs] = useState(true);
  const [logVersion, setLogVersion] = useState(0);
  const historyRef = useRef<Snap[]>([initialSnap()]);
  const stateRef = useRef<SimState>({} as SimState);
  const stepRef = useRef<() => void>(() => {});

  stateRef.current = { processes, algo, time, arrivalStep, admitted, running, queue };

  const flashLog = useCallback((msg: string) => {
    setLogMsg(msg);
    setFlash((n) => n + 1);
  }, []);

  const bumpLogs = useCallback(() => setLogVersion((n) => n + 1), []);

  const clearSimState = useCallback(
    (clearLog = true) => {
      setQueue([]);
      setRunning(null);
      setAdmitted(new Set());
      setArrivalStep(0);
      setTime(0);
      historyRef.current = [initialSnap()];
      if (clearLog) flashLog(IDLE_MSG);
    },
    [flashLog],
  );

  const applySnap = useCallback(
    (s: Snap, msg: string) => {
      const rows = stateRef.current.processes;
      const procMap = Object.fromEntries(rows.map((r) => [r.id, { ...r }]));
      setTime(s.time);
      setArrivalStep(s.arrivalStep);
      setAdmitted(new Set(s.admitted));
      setRunning(s.running ? (procMap[s.running] ?? null) : null);
      setQueue(s.queue.map((id) => procMap[id]).filter(Boolean));
      flashLog(msg);
    },
    [flashLog],
  );

  const { playing, stopPlay, togglePlay, playIcon, playLabel } = usePlayPause(() => {
    stepRef.current();
  }, 700);

  const step = useCallback(() => {
    const {
      processes: rows,
      algo: currentAlgo,
      admitted: adm,
      running: run,
      queue: q,
    } = stateRef.current;
    if (!rows.length) {
      flashLog("Add at least one valid process.");
      return;
    }
    const pending = rows
      .filter((r) => !adm.has(r.id))
      .sort((a, b) => a.arr - b.arr || a.id.localeCompare(b.id));
    if (!pending.length) {
      const full = fullRunOrder(rows, currentAlgo);
      const wait = formatQueueLog(q, currentAlgo);
      flashLog(
        run
          ? `All arrived at t=${stateRef.current.time}. On CPU: ${run.id}. Waiting: ${wait || "none"}. ` +
              `Full ${currentAlgo === "PRI" ? "Priority" : currentAlgo} run order (bottom chart): ${full}.`
          : "All processes have arrived.",
      );
      return;
    }

    const row = pending[0];
    const proc = { ...row };
    const newTime = proc.arr;
    const newAdmitted = new Set(adm);
    newAdmitted.add(proc.id);
    const newArrivalStep = newAdmitted.size;

    let newRunning = run;
    let newQueue = [...q];
    let dispatched = false;
    let preOrder = "";
    let postOrder = "";

    if (!newRunning) {
      newRunning = proc;
      dispatched = true;
    } else {
      preOrder = formatQueueLog(newQueue, currentAlgo);
      newQueue.push(proc);
      sortReadyQueue(newQueue, currentAlgo);
      postOrder = formatQueueLog(newQueue, currentAlgo);
    }

    const msg = explainStep(
      currentAlgo,
      proc,
      dispatched,
      preOrder,
      postOrder,
      newTime,
      newRunning,
      newQueue,
    );

    setTime(newTime);
    setAdmitted(newAdmitted);
    setArrivalStep(newArrivalStep);
    setRunning(newRunning);
    setQueue(newQueue);
    flashLog(msg);
    setTick((n) => n + 1);

    pushIfChanged(historyRef.current, {
      time: newTime,
      arrivalStep: newArrivalStep,
      admitted: [...newAdmitted],
      running: newRunning?.id ?? null,
      queue: newQueue.map((p) => p.id),
    });
  }, [flashLog]);

  stepRef.current = step;

  const doPrev = useCallback(() => {
    stopPlay();
    if (historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const s = historyRef.current[historyRef.current.length - 1];
    applySnap(s, s.arrivalStep === 0 ? IDLE_MSG : `Rewound to t=${s.time}.`);
  }, [stopPlay, applySnap]);

  const replaceProcesses = useCallback(
    (next: Process[], { resetLog = false }: { resetLog?: boolean } = {}) => {
      stopPlay();
      setProcesses(next);
      clearSimState(resetLog);
      bumpLogs();
    },
    [stopPlay, clearSimState, bumpLogs],
  );

  const changeAlgo = useCallback(
    (next: NonPreemptiveAlgo) => {
      if (next === stateRef.current.algo) return;
      stopPlay();
      setAlgo(next);
      clearSimState(true);
      flashLog(`Switched to ${next === "PRI" ? "Priority" : next}. Simulation reset.`);
      bumpLogs();
    },
    [stopPlay, clearSimState, flashLog, bumpLogs],
  );

  const addProcess = useCallback(() => {
    const prev = stateRef.current.processes;
    if (prev.length >= MAX_ROWS) return;
    const lastArr = prev.at(-1)?.arr ?? -1;
    replaceProcesses(
      [
        ...prev,
        {
          id: nextLetterId(prev),
          arr: lastArr + 1,
          burst: 1,
          pri: nextFreePriority(prev),
        },
      ],
      { resetLog: false },
    );
  }, [replaceProcesses]);

  const removeProcess = useCallback(() => {
    const prev = stateRef.current.processes;
    if (prev.length <= 1) return;
    replaceProcesses(prev.slice(0, -1), { resetLog: false });
  }, [replaceProcesses]);

  const importProcesses = useCallback(
    (next: Process[]) => {
      replaceProcesses(next, { resetLog: true });
      flashLog(`Loaded ${next.length} process${next.length === 1 ? "" : "es"} from file.`);
    },
    [replaceProcesses, flashLog],
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
      replaceProcesses(next, { resetLog: false });
    },
    [replaceProcesses],
  );

  const flipToLogs = useCallback(
    (opts: FlipOpts = {}) => {
      if (!opts.silent) {
        stopPlay();
        clearSimState(true);
      }
      setShowLogs(true);
      bumpLogs();
    },
    [stopPlay, clearSimState, bumpLogs],
  );

  const flipToSim = useCallback(
    (opts: FlipOpts = {}) => {
      if (!opts.silent) {
        stopPlay();
        clearSimState(true);
      }
      setShowLogs(false);
    },
    [stopPlay, clearSimState],
  );

  const eventLog = useMemo((): (EventLogResult & { title: string }) | null => {
    void logVersion;
    if (!processes.length) return null;
    const titles: Record<NonPreemptiveAlgo, string> = { FCFS: "FCFS", SJF: "SJF", PRI: "Priority" };
    const log = buildNonPreemptiveLog(processes, algo);
    return { ...log, title: (titles[algo] || algo) + " · Event Log" };
  }, [processes, algo, logVersion]);

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

  const waiting = processes.filter((r) => !admitted.has(r.id));

  return {
    processes,
    algo,
    time,
    arrivalStep,
    admitted,
    running,
    queue,
    waiting,
    logMsg,
    flash,
    tick,
    showLogs,
    eventLog,
    compare,
    sortRule: sortRuleText(algo),
    formatQueueLog: () => formatQueueLog(queue, algo),
    queueChipSub: (p: Process) => queueChipSub(p, algo),
    fullOrder: fullRunOrder(processes, algo),
    playing,
    playIcon,
    playLabel,
    stopPlay,
    togglePlay,
    step: () => {
      stopPlay();
      step();
    },
    doPrev,
    reset: () => {
      stopPlay();
      clearSimState(true);
    },
    changeAlgo,
    addProcess,
    removeProcess,
    importProcesses,
    commitField,
    flipToLogs,
    flipToSim,
    canAdd: processes.length < MAX_ROWS,
    canRemove: processes.length > 1,
    countLabel: `${processes.length} / ${MAX_ROWS}`,
  };
}
