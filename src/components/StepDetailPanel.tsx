import { renderStateTipHtml } from "../lib/eventLog.ts";
import type { LogSnap } from "../lib/types.ts";

const IDLE_SNAP: LogSnap = {
  time: 0,
  queue: [],
  cpu: null,
  done: [],
  transit: null,
};

interface StepDetailPanelProps {
  snap: LogSnap | null;
  started: boolean;
  canStart: boolean;
  canPrev: boolean;
  canNext: boolean;
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
}

export function StepDetailPanel({
  snap,
  started,
  canStart,
  canPrev,
  canNext,
  onStart,
  onPrev,
  onNext,
  onReset,
}: StepDetailPanelProps) {
  const viewSnap = started && snap ? snap : IDLE_SNAP;

  return (
    <div className="sim-panel sim-step-detail">
      <div className="sim-step-detail-head">
        <span className="sim-step-detail-label">Step view</span>
        <div className="sim-step-controls">
          {!started ? (
            <button
              type="button"
              className="sim-btn-amber sim-btn-start"
              disabled={!canStart}
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
            >
              Start
            </button>
          ) : (
            <>
              <button
                type="button"
                className="sim-btn-amber sim-btn-icon"
                title="Reset"
                aria-label="Reset"
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
              >
                ↺
              </button>
              <button
                type="button"
                className="sim-btn-amber sim-btn-icon"
                title="Prev"
                aria-label="Prev"
                disabled={!canPrev}
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
              >
                ⏮
              </button>
              <button
                type="button"
                className="sim-btn-amber sim-btn-icon"
                title="Next"
                aria-label="Next"
                disabled={!canNext}
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
              >
                ⏭
              </button>
            </>
          )}
        </div>
      </div>
      <div
        className="sim-step-detail-body"
        dangerouslySetInnerHTML={{ __html: renderStateTipHtml(viewSnap) }}
      />
    </div>
  );
}
