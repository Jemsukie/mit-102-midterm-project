import { AlgoCompareCards } from "../components/AlgoCompareCards.tsx";
import { DeckShell } from "../components/DeckShell.tsx";
import { EventLogPanel } from "../components/EventLogPanel.tsx";
import { ProcessTable } from "../components/ProcessTable.tsx";
import { StepDetailPanel } from "../components/StepDetailPanel.tsx";
import { useNonPreemptiveSim } from "../hooks/useNonPreemptiveSim.ts";
import type { NonPreemptiveAlgo } from "../lib/types.ts";

export default function NonPreemptivePage() {
  const sim = useNonPreemptiveSim();
  const { walk } = sim;

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
            onImportProcesses={sim.importProcesses}
          />
          <EventLogPanel
            title={sim.eventLog?.title || "Event Log"}
            html={sim.eventLog?.html || ""}
            plainText={sim.eventLog?.text || ""}
            started={walk.started}
            canStart={walk.canStart}
            canPrev={walk.canPrev}
            canNext={walk.canNext}
            activeIndex={walk.started ? walk.index : null}
            onStart={walk.start}
            onPrev={walk.prev}
            onNext={walk.next}
            onReset={walk.reset}
            headerExtra={
              <label className="sim-log-algo">
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
            }
          />
        </div>
        <StepDetailPanel snap={walk.activeSnap} started={walk.started} />
        <AlgoCompareCards
          compare={sim.compare}
          algo={sim.algo}
          onSelect={sim.changeAlgo}
        />
      </div>
    </DeckShell>
  );
}
