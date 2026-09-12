import { useCallback, useEffect, useState } from "react";
import type { LogSnap, LogWalkEvent } from "../lib/types.ts";

export const EMPTY_LOG_EVENTS: LogWalkEvent[] = [];

export function useLogWalkthrough(events: LogWalkEvent[]) {
  const list = events.length ? events : EMPTY_LOG_EVENTS;
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const count = list.length;

  useEffect(() => {
    setStarted(false);
    setIndex(0);
  }, [list]);

  const start = useCallback(() => {
    if (!count) return;
    setStarted(true);
    setIndex(0);
  }, [count]);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, Math.max(0, count - 1)));
  }, [count]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const reset = useCallback(() => {
    setStarted(false);
    setIndex(0);
  }, []);

  const active: LogWalkEvent | null = started && count ? (list[index] ?? null) : null;
  const activeSnap: LogSnap | null = active?.snap ?? null;
  const atEnd = active?.evt.kind === "end" || (started && count > 0 && index >= count - 1);

  return {
    started,
    index,
    count,
    active,
    activeSnap,
    start,
    next,
    prev,
    reset,
    canPrev: started && index > 0,
    canNext: started && !atEnd,
    canStart: count > 0,
  };
}
