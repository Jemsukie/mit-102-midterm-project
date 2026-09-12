import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RefObject } from "react";
import { renderStateTipHtml } from "../lib/eventLog.ts";
import type { LogSnap } from "../lib/types.ts";

function placeTip(tipEl: HTMLElement, clientX: number, clientY: number): void {
  if (!tipEl || tipEl.hidden) return;
  const tipRect = tipEl.getBoundingClientRect();
  const gap = 14;
  let left = clientX + gap;
  let top = clientY - tipRect.height / 2;
  if (left + tipRect.width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - tipRect.width - 8);
  }
  if (top < 8) top = 8;
  if (top + tipRect.height > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - tipRect.height - 8);
  }
  tipEl.style.left = `${left}px`;
  tipEl.style.top = `${top}px`;
}

/** Floating tip to the RIGHT of cursor for log event hover (ported to body). */
export function LogStateTip({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const root = containerRef?.current;
    const tip = tipRef.current;
    if (!root || !tip) return undefined;

    function hide(): void {
      tip!.hidden = true;
      setHidden(true);
    }

    function onEnter(e: MouseEvent): void {
      const el = (e.target as Element | null)?.closest(".log-evt");
      if (!el || !root!.contains(el)) return;
      let snap: LogSnap;
      try {
        snap = JSON.parse(el.getAttribute("data-snap") || "{}") as LogSnap;
      } catch {
        snap = { time: 0, queue: [], cpu: null, done: [], transit: null };
      }
      tip!.innerHTML = renderStateTipHtml(snap);
      setHidden(false);
      tip!.hidden = false;
      requestAnimationFrame(() => placeTip(tip!, e.clientX, e.clientY));
    }

    function onMove(e: MouseEvent): void {
      if (tip!.hidden) return;
      const el = (e.target as Element | null)?.closest(".log-evt");
      if (!el || !root!.contains(el)) return;
      placeTip(tip!, e.clientX, e.clientY);
    }

    function onLeave(e: MouseEvent): void {
      const el = (e.target as Element | null)?.closest(".log-evt");
      if (!el || !root!.contains(el)) return;
      const related = e.relatedTarget as Node | null;
      if (related && (el.contains(related) || tip!.contains(related))) return;
      hide();
    }

    root.addEventListener("mouseover", onEnter);
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseout", onLeave);
    return () => {
      root.removeEventListener("mouseover", onEnter);
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseout", onLeave);
      hide();
    };
  }, [containerRef]);

  return createPortal(
    <div
      ref={tipRef}
      id="log-state-tip"
      className="log-state-tip"
      hidden={hidden}
    />,
    document.body,
  );
}
