import { useEffect, useRef } from "react";
import { AlgoCompareCards } from "../components/AlgoCompareCards.tsx";
import { Chip } from "../components/Chip.tsx";
import { DeckShell } from "../components/DeckShell.tsx";
import { FlipCard } from "../components/FlipCard.tsx";
import { IconToolbar, ProcessTable } from "../components/ProcessTable.tsx";
import { useNonPreemptiveSim } from "../hooks/useNonPreemptiveSim.ts";
import type { NonPreemptiveAlgo } from "../lib/types.ts";

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

export default function NonPreemptivePage() {
  const sim = useNonPreemptiveSim();

  return (
    <DeckShell kicker="FCFS • SJF • Priority" pageLabel="1 / 2" activePage="np">
      <div className="sim-cpu-wrap">
        <div className="sim-cpu-layout">
          <ProcessTable
            processes={sim.processes}
            showPriority
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
            title={sim.eventLog?.title || "Event Log"}
            plainText={sim.eventLog?.text || ""}
            logHtml={sim.eventLog?.html || ""}
            frontClassName="sim-np-sim"
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
                    Algorithm
                    <select
                      value={sim.algo}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        sim.changeAlgo(e.target.value as NonPreemptiveAlgo);
                      }}
                    >
                      <option value="FCFS">FCFS</option>
                      <option value="SJF">SJF</option>
                      <option value="PRI">Priority</option>
                    </select>
                  </label>
                </IconToolbar>
                <div className="sim3-meta">
                  <span>
                    Clock: <strong><Clock time={sim.time} tick={sim.tick} /></strong>
                  </span>
                  <span>
                    On CPU:{" "}
                    <strong>
                      {sim.running
                        ? `${sim.running.id} (since t=${sim.running.arr})`
                        : "idle"}
                    </strong>
                  </span>
                  <span>
                    Ready queue:{" "}
                    <strong>{sim.queue.length ? sim.formatQueueLog() : "—"}</strong>
                  </span>
                  <span>
                    Not arrived:{" "}
                    <span>
                      {sim.waiting.map((r) => (
                        <Chip key={r.id} label={r.id} className="muted" />
                      ))}
                    </span>
                  </span>
                </div>
                <p className="sim-sort-rule">{sim.sortRule}</p>
                <div className="sim-np-cpu-row">
                  <div className="sim-cpu-box">
                    <div className="sim-cpu-box-label">CPU</div>
                    <div>
                      {sim.running ? (
                        <Chip
                          label={sim.running.id}
                          className="thread run"
                          sub={sim.queueChipSub(sim.running)}
                        />
                      ) : (
                        <Chip label="idle" className="muted" />
                      )}
                    </div>
                  </div>
                  <div className="sim-queue-visual">
                    {!sim.queue.length ? (
                      <Chip label="(empty — CPU holds the running process)" className="muted" />
                    ) : (
                      sim.queue.map((p, idx) => (
                        <span key={`${p.id}-${idx}`}>
                          {idx ? <span className="sim-q-arrow">→</span> : null}
                          <Chip
                            label={p.id}
                            className={idx === 0 ? "thread run" : "thread"}
                            sub={sim.queueChipSub(p)}
                          />
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <SimLog msg={sim.logMsg} flash={sim.flash} />
              </>
            )}
          />
        </div>
        <AlgoCompareCards
          compare={sim.compare}
          algo={sim.algo}
          arrivalStep={sim.arrivalStep}
          fullOrder={sim.fullOrder}
          onSelect={sim.changeAlgo}
        />
      </div>
    </DeckShell>
  );
}
