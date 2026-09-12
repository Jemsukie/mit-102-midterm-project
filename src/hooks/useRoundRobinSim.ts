import { useCallback, useMemo, useRef, useState } from "react";
import { MAX_ROWS } from "../lib/constants.ts";
import { buildRoundRobinLog } from "../lib/eventLog.ts";
import {
  cascadeUniqueArrival,
  cloneProcList,
  createDefaultProcesses,
  nextLetterId,
  sanitizeArrival,
} from "../lib/procs.ts";
import {
  admitArrivals,
  dispatchCpu,
  pushIfChanged,
  runFullSchedule,
  timelineToSegs,
} from "../lib/schedule.ts";
import type {
  EventLogResult,
  FlipOpts,
  Process,
  ProcField,
  ScheduleMetrics,
  TimelineTick,
} from "../lib/types.ts";
import { usePlayPause } from "./usePlayPause.ts";

const IDLE_MSG = "Edit processes and quantum, then Step through Round Robin preemptions.";

interface Snap {
  time: number;
  timeline: TimelineTick[];
  done: string[];
  running: string | null;
  queue: string[];
  qLeft: number;
  rem: number[];
  prevSegCount: number;
}

interface SimState {
  processes: Process[];
  quantum: number;
  time: number;
  timeline: TimelineTick[];
  done: Set<string>;
  running: Process | null;
  queue: Process[];
  qLeft: number;
  remMap: Record<string, number>;
  prevSegCount: number;
}

function initialSnap(procs: Process[]): Snap {
  return {
    time: 0,
    timeline: [],
    done: [],
    running: null,
    queue: [],
    qLeft: 0,
    rem: procs.map((p) => p.burst),
    prevSegCount: 0,
  };
}

export function useRoundRobinSim() {
  const [processes, setProcesses] = useState<Process[]>(() => createDefaultProcesses(5));
  const [quantumInput, setQuantumInput] = useState<number | "">(4);
  const [time, setTime] = useState(0);
  const [timeline, setTimeline] = useState<TimelineTick[]>([]);
  const [done, setDone] = useState(() => new Set<string>());
  const [running, setRunning] = useState<Process | null>(null);
  const [queue, setQueue] = useState<Process[]>([]);
  const [qLeft, setQLeft] = useState(0);
  const [remMap, setRemMap] = useState<Record<string, number>>(() => {
    const rows = createDefaultProcesses(5);
    return Object.fromEntries(rows.map((p) => [p.id, p.burst]));
  });
  const [prevSegCount, setPrevSegCount] = useState(0);
  const [highlightNewSeg, setHighlightNewSeg] = useState(false);
  const [logMsg, setLogMsg] = useState(IDLE_MSG);
  const [flash, setFlash] = useState(0);
  const [tick, setTick] = useState(0);
  const [showLogs, setShowLogs] = useState(true);
  const [logVersion, setLogVersion] = useState(0);
  const historyRef = useRef<Snap[]>([initialSnap(createDefaultProcesses(5))]);
  const stateRef = useRef<SimState>({} as SimState);
  const stepRef = useRef<() => void>(() => {});

  const quantum =
    Number.isNaN(Number(quantumInput)) || Number(quantumInput) < 1 ? 4 : Number(quantumInput);

  stateRef.current = {
    processes,
    quantum,
    time,
    timeline,
    done,
    running,
    queue,
    qLeft,
    remMap,
    prevSegCount,
  };

  const flashLog = useCallback((msg: string) => {
    setLogMsg(msg);
    setFlash((n) => n + 1);
  }, []);

  const bumpLogs = useCallback(() => setLogVersion((n) => n + 1), []);

  const clearSimState = useCallback(
    (rows?: Process[]) => {
      const list = rows || stateRef.current.processes;
      const procs = cloneProcList(list);
      const rem = Object.fromEntries(procs.map((p) => [p.id, p.burst]));
      setTime(0);
      setTimeline([]);
      setDone(new Set());
      setRunning(null);
      setQueue([]);
      setQLeft(0);
      setRemMap(rem);
      setPrevSegCount(0);
      setHighlightNewSeg(false);
      historyRef.current = [initialSnap(list)];
      flashLog(IDLE_MSG);
    },
    [flashLog],
  );

  const buildLiveProcs = useCallback((rows: Process[], rem?: Record<string, number>) => {
    const procs = cloneProcList(rows);
    if (rem) {
      procs.forEach((p) => {
        if (rem[p.id] != null) p.rem = rem[p.id];
      });
    }
    return procs;
  }, []);

  const applySnap = useCallback(
    (s: Snap, msg: string) => {
      const rows = stateRef.current.processes;
      const remObj = Object.fromEntries(rows.map((r, i) => [r.id, s.rem[i]]));
      const procs = buildLiveProcs(rows, remObj);
      setTime(s.time);
      setTimeline(s.timeline.map((x) => ({ ...x })));
      setDone(new Set(s.done));
      setRunning(s.running ? (procs.find((p) => p.id === s.running) ?? null) : null);
      setQueue(s.queue.map((id) => procs.find((p) => p.id === id)).filter((p): p is Process => Boolean(p)));
      setQLeft(s.qLeft);
      setRemMap(Object.fromEntries(procs.map((p) => [p.id, p.rem ?? p.burst])));
      setPrevSegCount(s.prevSegCount);
      setHighlightNewSeg(false);
      flashLog(msg);
    },
    [buildLiveProcs, flashLog],
  );

  const { playing, stopPlay, togglePlay, playIcon, playLabel } = usePlayPause(() => {
    stepRef.current();
  }, 400);

  const step = useCallback(() => {
    const s = stateRef.current;
    const rows = s.processes;
    if (!rows.length) {
      flashLog("Add at least one valid process.");
      return;
    }

    const procs = buildLiveProcs(rows, s.remMap);
    let timeV = s.time;
    let timelineV = [...s.timeline];
    let doneV = new Set(s.done);
    let runningV = s.running ? (procs.find((p) => p.id === s.running!.id) ?? null) : null;
    let queueV = s.queue
      .map((q) => procs.find((p) => p.id === (typeof q === "string" ? q : q.id)))
      .filter((p): p is Process => Boolean(p));
    let qLeftV = s.qLeft;
    let logText = "";

    if (doneV.size === procs.length) {
      flashLog("All processes complete.");
      return;
    }

    admitArrivals(procs, timeV, doneV, runningV, queueV);
    const qRef = { v: qLeftV };
    runningV = dispatchCpu("RR", doneV, runningV, queueV, s.quantum, qRef);
    qLeftV = qRef.v;

    if (!runningV) {
      const pending = procs.filter((p) => !doneV.has(p.id));
      const future = pending.map((p) => p.arr).filter((a) => a > timeV);
      if (future.length) {
        timeV = Math.min(...future);
        admitArrivals(procs, timeV, doneV, runningV, queueV);
        logText = `Time advances to t=${timeV} (next arrival).`;
      } else {
        logText = "All processes complete.";
      }
    } else {
      timelineV.push({ id: runningV.id, t: timeV });
      runningV.rem = (runningV.rem ?? 0) - 1;
      qLeftV--;
      if (runningV.rem === 0) {
        doneV.add(runningV.id);
        logText = `${runningV.id} finished at t=${timeV + 1}.`;
        runningV = null;
      } else {
        logText = `${runningV.id} on CPU (RR, rem=${runningV.rem}).`;
      }
      timeV++;
    }

    const rem = Object.fromEntries(procs.map((p) => [p.id, p.rem ?? p.burst]));
    const segs = timelineToSegs(timelineV);
    const grew = segs.length > s.prevSegCount;

    setTime(timeV);
    setTimeline(timelineV);
    setDone(doneV);
    setRunning(runningV ? { ...runningV } : null);
    setQueue(queueV.map((p) => ({ ...p })));
    setQLeft(qLeftV);
    setRemMap(rem);
    setPrevSegCount(segs.length);
    setHighlightNewSeg(grew);
    flashLog(logText);
    setTick((n) => n + 1);

    pushIfChanged(historyRef.current, {
      time: timeV,
      timeline: timelineV.map((x) => ({ ...x })),
      done: [...doneV],
      running: runningV?.id ?? null,
      queue: queueV.map((p) => p.id),
      qLeft: qLeftV,
      rem: procs.map((p) => p.rem ?? p.burst),
      prevSegCount: segs.length,
    });
  }, [buildLiveProcs, flashLog]);

  stepRef.current = step;

  const doPrev = useCallback(() => {
    stopPlay();
    if (historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const s = historyRef.current[historyRef.current.length - 1];
    applySnap(s, s.time === 0 && !s.timeline.length ? IDLE_MSG : `Rewound to t=${s.time}.`);
  }, [stopPlay, applySnap]);

  const replaceProcesses = useCallback(
    (next: Process[]) => {
      stopPlay();
      setProcesses(next);
      clearSimState(next);
      bumpLogs();
    },
    [stopPlay, clearSimState, bumpLogs],
  );

  const addProcess = useCallback(() => {
    const prev = stateRef.current.processes;
    if (prev.length >= MAX_ROWS) return;
    const lastArr = prev.at(-1)?.arr ?? 0;
    const n = prev.length + 1;
    replaceProcesses([
      ...prev,
      { id: nextLetterId(prev), arr: lastArr + 1, burst: 1, pri: n },
    ]);
  }, [replaceProcesses]);

  const removeProcess = useCallback(() => {
    const prev = stateRef.current.processes;
    if (prev.length <= 1) return;
    replaceProcesses(prev.slice(0, -1));
  }, [replaceProcesses]);

  const commitField = useCallback(
    (index: number, field: ProcField, raw: string) => {
      const prev = stateRef.current.processes;
      let next: Process[];
      if (field === "arr") {
        const cleaned = sanitizeArrival(raw);
        const withVal = prev.map((p, i) => (i === index ? { ...p, arr: cleaned } : p));
        next = cascadeUniqueArrival(withVal, index);
      } else if (field === "burst") {
        let n = parseInt(raw, 10);
        if (Number.isNaN(n) || n < 1) n = 1;
        next = prev.map((p, i) => (i === index ? { ...p, burst: n } : p));
      } else {
        return;
      }
      replaceProcesses(next);
    },
    [replaceProcesses],
  );

  const commitQuantum = useCallback(
    (raw: string) => {
      let q = parseInt(raw, 10);
      if (Number.isNaN(q) || q < 1) q = 4;
      stopPlay();
      setQuantumInput(q);
      clearSimState(stateRef.current.processes);
      bumpLogs();
    },
    [stopPlay, clearSimState, bumpLogs],
  );

  const flipToLogs = useCallback(
    (opts: FlipOpts = {}) => {
      if (!opts.silent) {
        stopPlay();
        clearSimState();
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
        clearSimState();
      }
      setShowLogs(false);
    },
    [stopPlay, clearSimState],
  );

  const eventLog = useMemo((): (EventLogResult & { title: string }) | null => {
    void logVersion;
    if (!processes.length) return null;
    const log = buildRoundRobinLog(processes, quantum);
    return { ...log, title: "Round Robin · Event Log" };
  }, [processes, quantum, logVersion]);

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

  const segs = timelineToSegs(timeline);

  const runningDisplay = running
    ? { ...running, rem: remMap[running.id] ?? running.rem }
    : null;

  return {
    processes,
    quantum,
    quantumInput,
    setQuantumInput,
    time,
    timeline,
    segs,
    highlightNewSeg,
    done,
    running: runningDisplay,
    queue,
    qLeft,
    logMsg,
    flash,
    tick,
    showLogs,
    eventLog,
    calc,
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
      clearSimState();
    },
    addProcess,
    removeProcess,
    commitField,
    commitQuantum,
    flipToLogs,
    flipToSim,
    canAdd: processes.length < MAX_ROWS,
    canRemove: processes.length > 1,
    countLabel: `${processes.length} / ${MAX_ROWS}`,
  };
}
