import { cloneProcList } from "./procs.ts";
import type {
  Algo,
  GanttSeg,
  Process,
  ScheduleResult,
  TimelineTick,
} from "./types.ts";

export function admitArrivals(
  procs: Process[],
  time: number,
  done: Set<string>,
  running: Process | null,
  queue: Process[],
): void {
  procs.forEach((p) => {
    if (p.arr <= time && !done.has(p.id) && p !== running && !queue.includes(p)) {
      queue.push(p);
    }
  });
}

export function dispatchCpu(
  algo: Algo,
  done: Set<string>,
  running: Process | null,
  queue: Process[],
  quantum: number,
  qLeftRef: { v: number },
): Process | null {
  if (algo === "RR") {
    if (!running || qLeftRef.v <= 0) {
      if (running && (running.rem ?? 0) > 0) queue.push(running);
      running = queue.length ? queue.shift()! : null;
      qLeftRef.v = running ? quantum : 0;
    }
  } else if (!running || running.rem === 0) {
    if (running && running.rem === 0) {
      done.add(running.id);
      running = null;
    }
    if (!running && queue.length) {
      if (algo === "SJF") queue.sort((a, b) => (a.rem ?? 0) - (b.rem ?? 0) || a.arr - b.arr);
      else if (algo === "PRI") queue.sort((a, b) => a.pri - b.pri || a.arr - b.arr);
      else queue.sort((a, b) => a.arr - b.arr);
      running = queue.shift()!;
    }
  }
  return running;
}

export function runFullSchedule(
  rows: Process[],
  algo: Algo,
  quantum: number,
): ScheduleResult {
  const procs = cloneProcList(rows);
  let time = 0;
  const done = new Set<string>();
  let running: Process | null = null;
  const queue: Process[] = [];
  const qLeftRef = { v: 0 };
  const timeline: TimelineTick[] = [];
  const guard = 10000;

  for (let i = 0; i < guard && done.size < procs.length; i++) {
    admitArrivals(procs, time, done, running, queue);
    running = dispatchCpu(algo, done, running, queue, quantum, qLeftRef);

    if (!running) {
      const pending = procs.filter((p) => !done.has(p.id));
      const future = pending.map((p) => p.arr).filter((a) => a > time);
      if (future.length) {
        time = Math.min(...future);
        continue;
      }
      break;
    }

    timeline.push({ id: running.id, t: time });
    running.rem = (running.rem ?? 0) - 1;
    if (algo === "RR") qLeftRef.v--;
    if (running.rem === 0) {
      done.add(running.id);
      running = null;
    }
    time++;
  }

  const finish: Record<string, number> = {};
  rows.forEach((r) => {
    const ticks = timeline.filter((x) => x.id === r.id);
    finish[r.id] = ticks.length ? ticks[ticks.length - 1].t + 1 : r.arr;
  });

  const metrics = rows.map((r) => {
    const f = finish[r.id];
    const tat = f - r.arr;
    const wt = tat - r.burst;
    return { id: r.id, finish: f, wt, tat };
  });
  const n = metrics.length || 1;
  const avgWt = metrics.reduce((s, m) => s + m.wt, 0) / n;
  const avgTat = metrics.reduce((s, m) => s + m.tat, 0) / n;
  return { timeline, finish, metrics, avgWt, avgTat };
}

export function timelineToSegs(timeline: TimelineTick[]): GanttSeg[] {
  const segs: GanttSeg[] = [];
  let cur: string | null = null;
  let len = 0;
  timeline.forEach((x) => {
    if (cur === x.id) len++;
    else {
      if (cur) segs.push({ id: cur, len });
      cur = x.id;
      len = 1;
    }
  });
  if (cur) segs.push({ id: cur, len });
  return segs;
}

export function sortReadyQueue(queue: Process[], algo: Algo): void {
  if (algo === "SJF") queue.sort((a, b) => a.burst - b.burst || a.arr - b.arr);
  else if (algo === "PRI") queue.sort((a, b) => a.pri - b.pri || a.arr - b.arr);
  else queue.sort((a, b) => a.arr - b.arr);
}

export function fullRunOrder(rows: Process[], algo: Algo): string {
  if (!rows.length) return "—";
  const { timeline } = runFullSchedule(rows, algo, 4);
  const order: string[] = [];
  timelineToSegs(timeline).forEach((s) => {
    if (order[order.length - 1] !== s.id) order.push(s.id);
  });
  return order.join(" → ") || "—";
}

export function snapEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function pushIfChanged<T>(history: T[], next: T): T[] {
  const last = history[history.length - 1];
  if (!last || !snapEqual(last, next)) history.push(next);
  return history;
}
