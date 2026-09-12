import { useCallback, useEffect, useRef, useState } from "react";
import { SIM_ICON } from "../lib/constants.ts";

/** Play/pause interval driver — mirrors vanilla wirePlay. */
export function usePlayPause(stepFn: () => void, intervalMs = 900) {
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(stepFn);
  stepRef.current = stepFn;

  const stopPlay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (timerRef.current) {
      stopPlay();
      return;
    }
    setPlaying(true);
    stepRef.current();
    timerRef.current = setInterval(() => stepRef.current(), intervalMs);
  }, [intervalMs, stopPlay]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  return {
    playing,
    stopPlay,
    togglePlay,
    playIcon: playing ? SIM_ICON.pause : SIM_ICON.play,
    playLabel: playing ? "Pause" : "Play",
  };
}
