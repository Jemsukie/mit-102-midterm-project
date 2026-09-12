import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

interface EventLogPanelProps {
  title: string;
  html: string;
  plainText: string;
  started: boolean;
  activeIndex: number | null;
  headerExtra?: ReactNode;
}

export function EventLogPanel({
  title,
  html,
  plainText,
  started,
  activeIndex,
  headerExtra,
}: EventLogPanelProps) {
  const viewRef = useRef<HTMLDivElement>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");

  useEffect(() => {
    setCopyLabel("Copy");
  }, [html]);

  useEffect(() => {
    const root = viewRef.current;
    if (!root) return;
    root.querySelectorAll(".log-evt.is-active").forEach((el) => {
      el.classList.remove("is-active");
    });
    if (activeIndex == null || activeIndex < 0) return;
    const el = root.querySelector(`.log-evt[data-index="${activeIndex}"]`);
    if (!el) return;
    el.classList.add("is-active");
    el.scrollIntoView({ block: "center", behavior: "smooth", inline: "nearest" });
  }, [activeIndex, html, started]);

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
    <div className="sim-panel sim-log-panel">
      <div className="sim-log-panel-head">
        <h3>{title}</h3>
        <div className="sim-log-panel-actions">
          {headerExtra}
          <button type="button" onClick={handleCopy}>
            {copyLabel}
          </button>
        </div>
      </div>
      <div
        className="log-view"
        ref={viewRef}
        dangerouslySetInnerHTML={{ __html: html || "" }}
      />
    </div>
  );
}
