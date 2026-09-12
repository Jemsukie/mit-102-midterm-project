export type NonPreemptiveAlgo = "FCFS" | "SJF" | "PRI";
export type Algo = NonPreemptiveAlgo | "RR";

export interface Process {
  id: string;
  arr: number;
  burst: number;
  pri: number;
  rem?: number;
}

export interface TimelineTick {
  id: string;
  t: number;
}

export interface GanttSeg {
  id: string;
  len: number;
}

export interface ScheduleMetrics {
  id: string;
  finish: number;
  wt: number;
  tat: number;
}

export interface EventLogMetrics {
  id: string;
  arrival: number;
  start: number;
  finish: number;
  wt: number;
  tat: number;
}

export interface ScheduleResult {
  timeline: TimelineTick[];
  finish: Record<string, number>;
  metrics: ScheduleMetrics[];
  avgWt: number;
  avgTat: number;
}

export interface LogWalkEvent {
  index: number;
  time: number;
  evt: LogEvent;
  snap: LogSnap;
}

export interface EventLogResult {
  html: string;
  text: string;
  title?: string;
  events: LogWalkEvent[];
}

export interface LogSnapProc {
  id: string;
  burst: number;
  arr: number;
  rem: number;
  start?: number;
  finish?: number;
}

export interface LogSnap {
  time: number;
  queue: LogSnapProc[];
  cpu: LogSnapProc | null;
  done: LogSnapProc[];
  transit: LogSnapProc | null;
}

export type LogEventKind =
  | "arrive"
  | "dequeue"
  | "cpu"
  | "finish"
  | "quantum"
  | "end";

export interface LogEvent {
  kind: LogEventKind;
  id?: string;
  burst?: number;
  queueEmpty?: boolean;
  q?: number;
  text?: string;
  snap?: LogSnap;
}

export type LogByTime = Record<number, LogEvent[]>;

export interface CompareCard {
  key: NonPreemptiveAlgo;
  timeline: TimelineTick[];
  avgWt: number | null;
  avgTat: number | null;
}

export type ProcField = "arr" | "burst" | "pri";

