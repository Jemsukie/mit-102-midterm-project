import { procColorClass } from "../lib/procs.ts";
import type { GanttSeg, TimelineTick } from "../lib/types.ts";

interface GanttBarProps {
  timeline?: TimelineTick[];
  segs?: GanttSeg[];
  highlightLast?: boolean;
  className?: string;
}

export function GanttBar({
  timeline = [],
  segs,
  highlightLast = false,
  className = "gantt",
}: GanttBarProps) {
  const segments =
    segs ||
    (() => {
      const out: GanttSeg[] = [];
      let cur: string | null = null;
      let len = 0;
      timeline.forEach((x) => {
        if (cur === x.id) len++;
        else {
          if (cur) out.push({ id: cur, len });
          cur = x.id;
          len = 1;
        }
      });
      if (cur) out.push({ id: cur, len });
      return out;
    })();

  return (
    <div className={className}>
      {segments.map((s, idx) => (
        <span
          key={`${s.id}-${idx}-${s.len}`}
          className={`${procColorClass(s.id)}${highlightLast && idx === segments.length - 1 ? " sim-gantt-new" : ""}`}
          style={{ flex: s.len }}
        >
          {s.id}
        </span>
      ))}
    </div>
  );
}
