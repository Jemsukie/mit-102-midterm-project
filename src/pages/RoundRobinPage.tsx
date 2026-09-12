import { DeckShell } from "../components/DeckShell.tsx";
import { EventLogPanel } from "../components/EventLogPanel.tsx";
import { ProcessTable } from "../components/ProcessTable.tsx";
import { StepDetailPanel } from "../components/StepDetailPanel.tsx";
import { useRoundRobinSim } from "../hooks/useRoundRobinSim.ts";

export default function RoundRobinPage() {
  const sim = useRoundRobinSim();
  const { walk } = sim;

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
            onImportProcesses={sim.importProcesses}
          />
          <EventLogPanel
            title={sim.eventLog?.title || "Round Robin · Event Log"}
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
            }
          />
        </div>
        <StepDetailPanel snap={walk.activeSnap} started={walk.started} />
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
