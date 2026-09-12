import { useEffect, useRef } from "react";
import { Chip } from "../components/Chip.tsx";
import { DeckShell } from "../components/DeckShell.tsx";
import { FlipCard } from "../components/FlipCard.tsx";
import { GanttBar } from "../components/GanttBar.tsx";
import { IconToolbar, ProcessTable } from "../components/ProcessTable.tsx";
import { useRoundRobinSim } from "../hooks/useRoundRobinSim.ts";

function SimLog({ msg, flash }: { msg: string; flash: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("sim-flash");
    void el.offsetWidth;
    el.classList.add("sim-flash");
  }, [flash, msg]);
  return (
    <div className="sim-log" ref={ref}>
      {msg}
    </div>
  );
}

function Clock({ time, tick }: { time: number; tick: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !tick) return;
    el.classList.remove("sim-tick");
    void el.offsetWidth;
    el.classList.add("sim-tick");
  }, [tick, time]);
  return (
    <span className="sim-clock" ref={ref}>
      t = {time}
    </span>
  );
}

export default function RoundRobinPage() {
  const sim = useRoundRobinSim();

  return (
    <DeckShell kicker="Round Robin" pageLabel="2 / 2" activePage="rr">
      <div className="sim-cpu-wrap">
        <div className="sim-cpu-layout">
          <ProcessTable
            processes={sim.processes}
            showPriority={false}
            countLabel={sim.countLabel}
            canAdd={sim.canAdd}
            canRemove={sim.canRemove}
            onAdd={sim.addProcess}
            onRemove={sim.removeProcess}
            onCommitField={sim.commitField}
          />
          <FlipCard
            flipped={sim.showLogs}
            onShowLogs={() => sim.flipToLogs()}
            onShowSim={() => sim.flipToSim()}
            title={sim.eventLog?.title || "Round Robin · Event Log"}
            plainText={sim.eventLog?.text || ""}
            logHtml={sim.eventLog?.html || ""}
            front={({ onShowLogs }) => (
              <>
                <IconToolbar
                  onPrev={sim.doPrev}
                  onPlay={sim.togglePlay}
                  onStep={sim.step}
                  onReset={sim.reset}
                  playIcon={sim.playIcon}
                  playLabel={sim.playLabel}
                  playActive={sim.playing}
                  onShowLogs={onShowLogs}
                >
                  <label>
                    Quantum
                    <input
                      type="number"
                      className="sim-quantum-in"
                      min={1}
                      max={99}
                      value={sim.quantumInput}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        sim.setQuantumInput(parseInt(e.target.value, 10) || "")
                      }
                      onBlur={(e) => {
                        e.stopPropagation();
                        sim.commitQuantum(e.target.value);
                      }}
                    />
                  </label>
                </IconToolbar>
                <div className="sim3-meta">
                  <span>
                    Clock: <strong><Clock time={sim.time} tick={sim.tick} /></strong>
                  </span>
                  <span>
                    Running:{" "}
                    <strong>
                      {sim.running
                        ? `${sim.running.id} (rem ${sim.running.rem})`
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    Slice left:{" "}
                    <strong>{sim.running ? String(sim.qLeft) : "—"}</strong>
                  </span>
                  <span>
                    Ready:{" "}
                    <span>
                      {sim.queue.map((p) => (
                        <Chip key={p.id} label={p.id} className="thread" />
                      ))}
                    </span>
                  </span>
                </div>
                <GanttBar
                  segs={sim.segs}
                  highlightLast={sim.highlightNewSeg}
                  className="gantt sim-cpu-gantt"
                />
                <SimLog msg={sim.logMsg} flash={sim.flash} />
              </>
            )}
          />
        </div>
        <div className="sim-calc-panel">
          <div className="sim-calc-head">
            Calculations · Round Robin (q = <span>{sim.quantum}</span>)
          </div>
          <table className="sim-calc-table">
            <thead>
              <tr>
                <th>Process</th>
                <th>Finish</th>
                <th>WT</th>
                <th>TAT</th>
              </tr>
            </thead>
            <tbody>
              {sim.calc.metrics.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.finish}</td>
                  <td>{m.wt}</td>
                  <td>{m.tat}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Average</td>
                <td>
                  {sim.calc.avgWt == null ? "—" : sim.calc.avgWt.toFixed(2)}
                </td>
                <td>
                  {sim.calc.avgTat == null ? "—" : sim.calc.avgTat.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </DeckShell>
  );
}
