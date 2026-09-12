import { procColorClass } from "./procs.ts";
import type {
  EventLogMetrics,
  EventLogResult,
  LogByTime,
  LogEvent,
  LogSnap,
  LogSnapProc,
  LogWalkEvent,
  NonPreemptiveAlgo,
  Process,
} from "./types.ts";

type ProcRef = Process | string | null | undefined;

interface TipOpts {
  emptyLabel?: string;
  cpuMath?: boolean;
  time?: number;
}

function snapLogState(
  queue: ProcRef[],
  running: ProcRef,
  done: Iterable<string>,
  transit: ProcRef,
  rem: Record<string, number> | undefined,
  startCpu: Record<string, number> | undefined,
  finish: Record<string, number> | undefined,
  time: number,
  procMap: Record<string, Process> | undefined,
): LogSnap {
  function pack(ref: ProcRef): LogSnapProc | null {
    if (ref == null) return null;
    const id = typeof ref === "string" ? ref : ref.id;
    const base =
      (procMap && procMap[id]) ||
      (typeof ref === "object" ? ref : null) ||
      { id, burst: 0, arr: 0, pri: 99 };
    return {
      id,
      burst: base.burst,
      arr: base.arr,
      rem: rem && rem[id] != null ? rem[id] : base.burst,
      start: startCpu ? startCpu[id] : undefined,
      finish: finish ? finish[id] : undefined,
    };
  }
  return {
    time,
    queue: queue.map((p) => pack(p)!),
    cpu: running ? pack(running) : null,
    done: [...done].map((id) => pack(id)!),
    transit: transit != null ? pack(transit) : null,
  };
}

function pushEvt(
  bucket: LogByTime,
  t: number,
  evt: LogEvent,
  queue: ProcRef[],
  running: ProcRef,
  done: Iterable<string>,
  transit: ProcRef,
  rem: Record<string, number> | undefined,
  startCpu: Record<string, number> | undefined,
  finish: Record<string, number> | undefined,
  procMap: Record<string, Process> | undefined,
): void {
  if (!bucket[t]) bucket[t] = [];
  evt.snap = snapLogState(queue, running, done, transit, rem, startCpu, finish, t, procMap);
  bucket[t].push(evt);
}

export function escapeHtml(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pidChip(id: string): string {
  return `<span class="log-pid ${procColorClass(id)}">${escapeHtml(id)}</span>`;
}

function tipProcStack(p: LogSnapProc | string | null | undefined, opts?: TipOpts): string {
  if (!p) return `<span class="log-tip-empty">${opts?.emptyLabel ? opts.emptyLabel : "·"}</span>`;
  if (typeof p === "string") {
    return `<div class="log-tip-card ${procColorClass(p)}">
    <div class="log-tip-card-burst">B0</div>
    <div class="log-tip-card-id">${escapeHtml(p)}</div>
  </div>`;
  }
  const cls = procColorClass(p.id);
  if (opts?.cpuMath) {
    const t = opts.time ?? 0;
    const rem = p.rem != null ? p.rem : p.burst;
    const f = p.finish != null ? p.finish : t + rem;
    return `<div class="log-tip-card ${cls}">
      <div class="log-tip-card-eq">B${p.burst} − A${p.arr} = F${f}</div>
      <div class="log-tip-card-id">${escapeHtml(p.id)}</div>
      <div class="log-tip-card-eq">F${f} − T${t} = C${rem}</div>
    </div>`;
  }
  return `<div class="log-tip-card ${cls}">
    <div class="log-tip-card-burst">B${p.burst}</div>
    <div class="log-tip-card-id">${escapeHtml(p.id)}</div>
  </div>`;
}

export function renderStateTipHtml(snap: LogSnap | null | undefined): string {
  if (!snap) return "";
  const t = snap.time != null ? snap.time : 0;
  const q =
    snap.queue && snap.queue.length
      ? snap.queue.map((p) => tipProcStack(p)).join("")
      : `<span class="log-tip-empty">empty</span>`;
  const transit = tipProcStack(snap.transit, { emptyLabel: "·" });
  const cpu = snap.cpu
    ? tipProcStack(snap.cpu, { cpuMath: true, time: t })
    : `<span class="log-tip-empty">idle</span>`;
  const done =
    snap.done && snap.done.length
      ? snap.done.map((p) => pidChip(typeof p === "string" ? p : p.id)).join("")
      : `<span class="log-tip-empty">none</span>`;
  return `
    <div class="log-tip-legend">
      <span><strong>A</strong> Arrival</span>
      <span><strong>B</strong> Burst</span>
      <span><strong>C</strong> CPU left</span>
      <span><strong>F</strong> Finish</span>
      <span><strong>T</strong> Current</span>
    </div>
    <div class="log-tip-boxes">
      <div class="log-tip-box">
        <div class="log-tip-label">Queue</div>
        <div class="log-tip-slot">${q}</div>
      </div>
      <div class="log-tip-transit">
        <div class="log-tip-label">Dispatch</div>
        <div class="log-tip-slot">${transit}</div>
      </div>
      <div class="log-tip-box log-tip-cpu">
        <div class="log-tip-label">CPU</div>
        <div class="log-tip-slot">${cpu}</div>
      </div>
    </div>
    <div class="log-tip-done"><span class="log-tip-done-label">Done:</span> ${done}</div>
  `;
}

function snapAttr(snap: LogSnap | Partial<LogSnap> | null | undefined): string {
  return escapeHtml(JSON.stringify(snap || { queue: [], cpu: null, done: [] }));
}

function renderLogEvent(evt: LogEvent): string {
  const chip = evt.id ? pidChip(evt.id) : "";
  switch (evt.kind) {
    case "arrive":
      return `${chip} arrives in the queue <span class="log-dim">(burst ${evt.burst})</span>`;
    case "dequeue":
      return evt.queueEmpty
        ? `${chip} is dequeued, Queue Empty`
        : `${chip} is dequeued`;
    case "cpu":
      return `${chip} uses the CPU ⚡`;
    case "finish":
      return `${chip} is finished ✅`;
    case "quantum":
      return `${chip} quantum expired <span class="log-dim">(q=${evt.q})</span>, returns to queue ⏱️`;
    case "end":
      return chip
        ? `${chip} is finished, SIMULATION ENDS 🏁`
        : `SIMULATION ENDS 🏁`;
    default:
      return escapeHtml(evt.text || "");
  }
}

function wrapLogEvent(evt: LogEvent, index: number): string {
  const snap = snapAttr(evt.snap || { queue: [], cpu: null, done: [] });
  return `<div class="log-evt" data-index="${index}" data-snap="${snap}">${renderLogEvent(evt)}</div>`;
}

function eventPlainText(evt: LogEvent): string {
  const id = evt.id || "";
  switch (evt.kind) {
    case "arrive":
      return `${id} arrives in the queue (burst ${evt.burst})`;
    case "dequeue":
      return evt.queueEmpty ? `${id} is dequeued, Queue Empty` : `${id} is dequeued`;
    case "cpu":
      return `${id} uses the CPU`;
    case "finish":
      return `${id} is finished`;
    case "quantum":
      return `${id} quantum expired (q=${evt.q}), returns to queue`;
    case "end":
      return id ? `${id} is finished, SIMULATION ENDS` : "SIMULATION ENDS";
    default:
      return evt.text || "";
  }
}

type BusySeg = { kind: "busy"; t: number; evts: LogEvent[] };
type EmptySeg = { kind: "empty"; from: number; to: number };
type Segment = BusySeg | EmptySeg;

export function formatEventLog(
  title: string,
  logByTime: LogByTime,
  metrics: EventLogMetrics[],
): EventLogResult {
  const blocks: string[] = [];
  const events: LogWalkEvent[] = [];
  blocks.push(`<div class="log-head">${escapeHtml(title)} Scheduling Simulator</div>`);

  const eventTimes = Object.keys(logByTime).map(Number);
  const startT = eventTimes.length ? Math.min(...eventTimes) : 0;
  const endFromEvents = eventTimes.length ? Math.max(...eventTimes) : 0;
  const endFromMetrics = metrics.reduce((m, x) => Math.max(m, x.finish || 0), 0);
  const endT = Math.max(endFromEvents, endFromMetrics);

  function pushRow(t: number, bodyHtml: string): void {
    const empty = !bodyHtml;
    const body = bodyHtml || `<span class="log-soft-line" aria-hidden="true"></span>`;
    blocks.push(
      `<div class="log-row${empty ? " log-row-empty" : ""}"><div class="log-t">${t}</div><div class="log-sep">:</div><div class="log-body">${body}</div></div>`,
    );
  }

  function pushRule(): void {
    blocks.push(
      `<div class="log-rule" aria-hidden="true"><span class="log-rule-mark"></span></div>`,
    );
  }

  function pushEmptyGap(from: number, to: number): void {
    const len = to - from + 1;
    if (len > 2) {
      pushRow(from, "");
      blocks.push(`<div class="log-gap" aria-hidden="true"><span class="log-gap-line"></span></div>`);
      pushRow(to, "");
    } else {
      for (let t = from; t <= to; t++) pushRow(t, "");
    }
  }

  function takeEvt(t: number, evt: LogEvent): string {
    const index = events.length;
    const snap = evt.snap || { time: t, queue: [], cpu: null, done: [], transit: null };
    events.push({ index, time: t, evt, snap });
    return wrapLogEvent(evt, index);
  }

  function bodyFor(t: number, evts: LogEvent[]): string {
    if (!evts.length) return "";
    const first = takeEvt(t, evts[0]);
    const rest = evts
      .slice(1)
      .map((evt) => `<div class="log-cont">${takeEvt(t, evt)}</div>`)
      .join("");
    return `<div class="log-first">${first}</div>${rest}`;
  }

  let t = startT;
  const segments: Segment[] = [];
  while (t <= endT) {
    const evts = logByTime[t] || [];
    if (evts.length) {
      segments.push({ kind: "busy", t, evts });
      t++;
    } else {
      let end = t;
      while (end + 1 <= endT && !(logByTime[end + 1] || []).length) end++;
      segments.push({ kind: "empty", from: t, to: end });
      t = end + 1;
    }
  }

  segments.forEach((seg, i) => {
    if (seg.kind === "busy") pushRow(seg.t, bodyFor(seg.t, seg.evts));
    else pushEmptyGap(seg.from, seg.to);
    if (i < segments.length - 1) {
      const next = segments[i + 1];
      if (seg.kind === "busy" && next.kind === "busy") pushRule();
    }
  });

  blocks.push(
    `<div class="log-metrics-head">Waiting time <span class="log-dim">(CPU start − arrival)</span></div>`,
  );
  metrics.forEach((m) => {
    blocks.push(
      `<div class="log-metric">${pidChip(m.id)}: ${m.start} − ${m.arrival} = <strong>${m.wt}</strong> ms</div>`,
    );
  });
  if (metrics.length) {
    const avgWt = metrics.reduce((s, m) => s + m.wt, 0) / metrics.length;
    const avgTat = metrics.reduce((s, m) => s + m.tat, 0) / metrics.length;
    blocks.push(
      `<div class="log-avgs">avg WT <strong>${avgWt.toFixed(2)}</strong> · avg TAT <strong>${avgTat.toFixed(2)}</strong></div>`,
    );
  }

  const plain: string[] = [];
  plain.push(title + " Scheduling Simulator");
  plain.push("");
  segments.forEach((seg, i) => {
    if (seg.kind === "busy") {
      plain.push(seg.t + " : " + eventPlainText(seg.evts[0]));
      seg.evts.slice(1).forEach((evt) => plain.push("    " + eventPlainText(evt)));
    } else {
      const len = seg.to - seg.from + 1;
      if (len > 2) {
        plain.push(seg.from + " :");
        plain.push("|");
        plain.push(seg.to + " :");
      } else {
        for (let x = seg.from; x <= seg.to; x++) plain.push(x + " :");
      }
    }
    if (i < segments.length - 1) plain.push("---");
  });
  plain.push("");
  plain.push("Waiting time of each process (start of CPU use - arrival time)");
  metrics.forEach((m) => {
    plain.push(m.id + ":\t" + m.start + " - " + m.arrival + " = " + m.wt + " milliseconds");
  });
  if (metrics.length) {
    const avgWt = metrics.reduce((s, m) => s + m.wt, 0) / metrics.length;
    const avgTat = metrics.reduce((s, m) => s + m.tat, 0) / metrics.length;
    plain.push("");
    plain.push("Average waiting time:\t" + avgWt.toFixed(2));
    plain.push("Average turnaround time:\t" + avgTat.toFixed(2));
  }

  return { html: blocks.join(""), text: plain.join("\n"), events };
}

function sortReadyForLog(queue: Process[], algo: NonPreemptiveAlgo): void {
  if (algo === "SJF") queue.sort((a, b) => a.burst - b.burst || a.arr - b.arr || a.id.localeCompare(b.id));
  else if (algo === "PRI") queue.sort((a, b) => a.pri - b.pri || a.arr - b.arr || a.id.localeCompare(b.id));
  else queue.sort((a, b) => a.arr - b.arr || a.id.localeCompare(b.id));
}

export function buildNonPreemptiveLog(rows: Process[], algo: NonPreemptiveAlgo): EventLogResult {
  const procs = rows.map((r) => ({ ...r })).sort((a, b) => a.arr - b.arr || a.id.localeCompare(b.id));
  const procMap = Object.fromEntries(procs.map((p) => [p.id, p]));
  const logByTime: LogByTime = {};
  const queue: Process[] = [];
  const rem = Object.fromEntries(procs.map((p) => [p.id, p.burst]));
  const arrived = new Set<string>();
  const done = new Set<string>();
  const startCpu: Record<string, number> = {};
  const finish: Record<string, number> = {};
  let time = procs[0]?.arr ?? 0;
  let running: Process | null = null;
  let guard = 0;

  function snapPush(t: number, evt: LogEvent, transit: Process | null): void {
    pushEvt(logByTime, t, evt, queue, running, done, transit, rem, startCpu, finish, procMap);
  }

  function admitAt(t: number): void {
    procs.forEach((p) => {
      if (!arrived.has(p.id) && p.arr === t) {
        arrived.add(p.id);
        queue.push(p);
        snapPush(t, { kind: "arrive", id: p.id, burst: p.burst }, null);
      }
    });
  }
  function dispatch(t: number): void {
    if (running || !queue.length) return;
    sortReadyForLog(queue, algo);
    const nxt = queue.shift()!;
    const queueEmpty = queue.length === 0;
    snapPush(t, { kind: "dequeue", id: nxt.id, queueEmpty }, nxt);
    running = nxt;
    startCpu[nxt.id] = t;
    snapPush(t, { kind: "cpu", id: nxt.id }, null);
  }

  admitAt(time);
  dispatch(time);
  while (done.size < procs.length && guard++ < 20000) {
    const active = running as Process | null;
    if (active === null) {
      const future = procs.filter((p) => !arrived.has(p.id)).map((p) => p.arr);
      if (!future.length) break;
      time = Math.min(...future);
      admitAt(time);
      dispatch(time);
      continue;
    }
    const finishAt = time + rem[active.id];
    const nextArrivals = procs.filter((p) => !arrived.has(p.id) && p.arr > time).map((p) => p.arr);
    const nextT = nextArrivals.length ? Math.min(finishAt, ...nextArrivals) : finishAt;
    rem[active.id] -= nextT - time;
    time = nextT;
    admitAt(time);
    if (rem[active.id] === 0) {
      const finishedId = active.id;
      finish[finishedId] = time;
      done.add(finishedId);
      running = null;
      if (done.size === procs.length) {
        snapPush(time, { kind: "end", id: finishedId }, null);
        break;
      }
      snapPush(time, { kind: "finish", id: finishedId }, null);
      dispatch(time);
    }
  }
  const metrics = procs
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => {
      const s = startCpu[p.id] ?? p.arr;
      const f = finish[p.id] ?? p.arr;
      return { id: p.id, arrival: p.arr, start: s, finish: f, wt: f - p.arr - p.burst, tat: f - p.arr };
    });
  const title =
    algo === "SJF"
      ? "Shortest-Job-First (SJF)"
      : algo === "PRI"
        ? "Priority (1 = highest)"
        : "First-Come, First-Served (FCFS)";
  return formatEventLog(title, logByTime, metrics);
}

export function buildRoundRobinLog(rows: Process[], quantum: number): EventLogResult {
  const q = Math.max(1, Number(quantum) || 1);
  const procs = rows.map((r) => ({ ...r })).sort((a, b) => a.arr - b.arr || a.id.localeCompare(b.id));
  const procMap = Object.fromEntries(procs.map((p) => [p.id, p]));
  const logByTime: LogByTime = {};
  const queue: Process[] = [];
  const rem = Object.fromEntries(procs.map((p) => [p.id, p.burst]));
  const arrived = new Set<string>();
  const done = new Set<string>();
  const startCpu: Record<string, number> = {};
  const finish: Record<string, number> = {};
  let time = procs[0]?.arr ?? 0;
  let running: Process | null = null;
  let sliceLeft = 0;
  let guard = 0;

  function snapPush(t: number, evt: LogEvent, transit: Process | null): void {
    pushEvt(logByTime, t, evt, queue, running, done, transit, rem, startCpu, finish, procMap);
  }

  function admitAt(t: number): void {
    procs.forEach((p) => {
      if (!arrived.has(p.id) && p.arr === t) {
        arrived.add(p.id);
        queue.push(p);
        snapPush(t, { kind: "arrive", id: p.id, burst: p.burst }, null);
      }
    });
  }
  function dispatch(t: number): void {
    if (running || !queue.length) return;
    const nxt = queue.shift()!;
    const queueEmpty = queue.length === 0;
    snapPush(t, { kind: "dequeue", id: nxt.id, queueEmpty }, nxt);
    running = nxt;
    sliceLeft = q;
    if (startCpu[nxt.id] === undefined) startCpu[nxt.id] = t;
    snapPush(t, { kind: "cpu", id: nxt.id }, null);
  }

  admitAt(time);
  dispatch(time);
  while (done.size < procs.length && guard++ < 50000) {
    const active = running as Process | null;
    if (active === null) {
      const future = procs.filter((p) => !arrived.has(p.id)).map((p) => p.arr);
      if (!future.length) break;
      time = Math.min(...future);
      admitAt(time);
      dispatch(time);
      continue;
    }
    const runCap = Math.min(sliceLeft, rem[active.id]);
    const finishSliceAt = time + runCap;
    const nextArrivals = procs.filter((p) => !arrived.has(p.id) && p.arr > time).map((p) => p.arr);
    const nextT = nextArrivals.length ? Math.min(finishSliceAt, ...nextArrivals) : finishSliceAt;
    const ran = nextT - time;
    rem[active.id] -= ran;
    sliceLeft -= ran;
    time = nextT;
    admitAt(time);
    if (rem[active.id] === 0) {
      const finishedId = active.id;
      finish[finishedId] = time;
      done.add(finishedId);
      running = null;
      sliceLeft = 0;
      if (done.size === procs.length) {
        snapPush(time, { kind: "end", id: finishedId }, null);
        break;
      }
      snapPush(time, { kind: "finish", id: finishedId }, null);
      dispatch(time);
      continue;
    }
    if (sliceLeft === 0) {
      queue.push(active);
      running = null;
      snapPush(time, { kind: "quantum", id: active.id, q }, null);
      dispatch(time);
    }
  }
  const metrics = procs
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => {
      const s = startCpu[p.id] ?? p.arr;
      const f = finish[p.id] ?? p.arr;
      return { id: p.id, arrival: p.arr, start: s, finish: f, wt: f - p.arr - p.burst, tat: f - p.arr };
    });
  return formatEventLog("Round Robin (q=" + q + ")", logByTime, metrics);
}
