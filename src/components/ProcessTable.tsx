import type { MouseEvent, ReactNode } from "react";
import { SIM_ICON } from "../lib/constants.ts";
import type { Process, ProcField } from "../lib/types.ts";

interface ProcessTableProps {
  processes: Process[];
  showPriority?: boolean;
  countLabel: string;
  canAdd: boolean;
  canRemove: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onCommitField: (index: number, field: ProcField, raw: string) => void;
}

export function ProcessTable({
  processes,
  showPriority = true,
  countLabel,
  canAdd,
  canRemove,
  onAdd,
  onRemove,
  onCommitField,
}: ProcessTableProps) {
  return (
    <div className="sim-proc-panel">
      <div className="sim-toolbar">
        <button
          type="button"
          className="sim-btn-add"
          title="Add process"
          aria-label="Add process"
          disabled={!canAdd}
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
        >
          +
        </button>
        <button
          type="button"
          className="sim-btn-remove"
          title="Remove process"
          aria-label="Remove process"
          disabled={!canRemove}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          −
        </button>
        <span className="sim-proc-count">{countLabel}</span>
      </div>
      <div className="sim-proc-table-wrap">
        <table className="sim-proc-table">
          <thead>
            <tr>
              <th>Process</th>
              <th>Burst</th>
              <th>Arrival</th>
              {showPriority ? (
                <th className="sim-pri-col" title="Used by Priority scheduling only">
                  Priority
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {processes.map((p, idx) => (
              <tr key={p.id}>
                <td>
                  <input
                    className="sim-f-id"
                    type="text"
                    value={p.id}
                    maxLength={6}
                    readOnly
                    tabIndex={-1}
                  />
                </td>
                <td>
                  <input
                    className="sim-f-burst"
                    type="number"
                    min={1}
                    max={999}
                    step={1}
                    defaultValue={p.burst}
                    key={`burst-${p.id}-${p.burst}`}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      e.stopPropagation();
                      onCommitField(idx, "burst", e.target.value);
                    }}
                  />
                </td>
                <td>
                  <input
                    className="sim-f-arr"
                    type="number"
                    min={0}
                    max={999}
                    step={1}
                    inputMode="numeric"
                    defaultValue={p.arr}
                    key={`arr-${p.id}-${p.arr}`}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      e.stopPropagation();
                      onCommitField(idx, "arr", e.target.value);
                    }}
                  />
                </td>
                {showPriority ? (
                  <td className="sim-pri-col">
                    <input
                      className="sim-f-pri"
                      type="number"
                      min={1}
                      max={99}
                      step={1}
                      defaultValue={p.pri}
                      key={`pri-${p.id}-${p.pri}`}
                      title="Used by Priority only"
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        e.stopPropagation();
                        onCommitField(idx, "pri", e.target.value);
                      }}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface IconToolbarProps {
  children?: ReactNode;
  onPrev: () => void;
  onPlay: () => void;
  onStep: () => void;
  onReset: () => void;
  playIcon: string;
  playLabel: string;
  playActive: boolean;
  onShowLogs?: () => void;
}

export function IconToolbar({
  children,
  onPrev,
  onPlay,
  onStep,
  onReset,
  playIcon,
  playLabel,
  playActive,
  onShowLogs,
}: IconToolbarProps) {
  return (
    <div className="sim-toolbar">
      {children}
      <button
        type="button"
        className="sim-btn-icon"
        title="Prev"
        aria-label="Prev"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onPrev();
        }}
      >
        {SIM_ICON.prev}
      </button>
      <button
        type="button"
        className={`sim-btn-icon${playActive ? " sim-play-active" : ""}`}
        title={playLabel}
        aria-label={playLabel}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onPlay();
        }}
      >
        {playIcon}
      </button>
      <button
        type="button"
        className="sim-btn-icon"
        title="Next"
        aria-label="Next"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onStep();
        }}
      >
        {SIM_ICON.step}
      </button>
      <button
        type="button"
        className="sim-btn-icon"
        title="Reset"
        aria-label="Reset"
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onReset();
        }}
      >
        {SIM_ICON.reset}
      </button>
      {onShowLogs ? (
        <button
          type="button"
          className="btn-flip-logs"
          title="Show event log"
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onShowLogs();
          }}
        >
          Logs
        </button>
      ) : null}
    </div>
  );
}
