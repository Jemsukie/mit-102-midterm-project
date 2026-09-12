import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

interface DeckShellProps {
  kicker: string;
  pageLabel: string;
  activePage: "np" | "rr";
  children: ReactNode;
}

export function DeckShell({ kicker, pageLabel, activePage, children }: DeckShellProps) {
  return (
    <div className="deck">
      <div className="stage" id="stage">
        <section className="slide sim-slide active">
          <p className="kicker">{kicker}</p>
          {children}
        </section>
        <div className="footer-bar">
          <span>MIT102 · Processor Management · Midterms</span>
          <div className="deck-nav">
            {activePage === "np" ? (
              <NavLink to="/round-robin" className="deck-nav-primary">
                Round Robin →
              </NavLink>
            ) : (
              <NavLink to="/" end className="deck-nav-primary">
                ← FCFS / SJF / Priority
              </NavLink>
            )}
            <span id="pageLabel">{pageLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
