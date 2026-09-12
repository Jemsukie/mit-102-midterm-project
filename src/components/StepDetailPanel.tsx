import { renderStateTipHtml } from "../lib/eventLog.ts";
import type { LogSnap } from "../lib/types.ts";

interface StepDetailPanelProps {
  snap: LogSnap | null;
  started: boolean;
}

export function StepDetailPanel({ snap, started }: StepDetailPanelProps) {
  if (!started || !snap) {
    return (
      <div className="sim-panel sim-step-detail sim-step-detail-idle">
        <p>Press <strong>Start</strong> to walk through the event log. Queue · Dispatch · CPU will appear here for the active step.</p>
      </div>
    );
  }

  return (
    <div
      className="sim-panel sim-step-detail"
      dangerouslySetInnerHTML={{ __html: renderStateTipHtml(snap) }}
    />
  );
}
