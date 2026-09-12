import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { LogStateTip } from "./LogStateTip.tsx";

interface FrontArgs {
  onShowLogs: () => void;
}

interface FlipCardProps {
  flipped: boolean;
  onShowLogs: () => void;
  onShowSim: () => void;
  title?: string;
  plainText?: string;
  logHtml?: string;
  front: ReactNode | ((args: FrontArgs) => ReactNode);
  frontClassName?: string;
}

export function FlipCard({
  flipped,
  onShowLogs,
  onShowSim,
  title,
  plainText,
  logHtml,
  front,
  frontClassName = "",
}: FlipCardProps) {
  const viewRef = useRef<HTMLDivElement>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");

  useEffect(() => {
    setCopyLabel("Copy");
  }, [logHtml]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape" && flipped) onShowSim();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [flipped, onShowSim]);

  async function handleCopy(e: MouseEvent<HTMLButtonElement>): Promise<void> {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(plainText || viewRef.current?.textContent || "");
      setCopyLabel("Copied");
      setTimeout(() => setCopyLabel("Copy"), 900);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`sim-flip${flipped ? " flipped" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="sim-flip-inner">
        <div className={`sim-flip-face sim-flip-front sim-panel sim-cpu-sim ${frontClassName}`.trim()}>
          {typeof front === "function" ? front({ onShowLogs }) : front}
        </div>
        <div className="sim-flip-face sim-flip-back sim-panel">
          <div className="sim-flip-back-head">
            <h3>{title || "Event Log"}</h3>
            <div className="sim-flip-back-actions">
              <button type="button" onClick={handleCopy}>{copyLabel}</button>
              <button
                type="button"
                className="btn-flip-logs"
                title="Back to simulation"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowSim();
                }}
              >
                Sim
              </button>
            </div>
          </div>
          <div
            className="log-view"
            ref={viewRef}
            dangerouslySetInnerHTML={{ __html: logHtml || "" }}
          />
          <LogStateTip containerRef={viewRef} />
        </div>
      </div>
    </div>
  );
}
