import { useEffect, useState } from "react";

interface ChipProps {
  label: string;
  className?: string;
  sub?: string;
  instant?: boolean;
}

export function Chip({ label, className = "", sub, instant = false }: ChipProps) {
  const [visible, setVisible] = useState(instant);

  useEffect(() => {
    if (instant) {
      setVisible(true);
      return;
    }
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [label, className, sub, instant]);

  return (
    <span className={`sim-chip ${className}${visible ? " sim-visible" : ""}`}>
      {label}
      {sub ? <span className="sim-chip-sub">{sub}</span> : null}
    </span>
  );
}
