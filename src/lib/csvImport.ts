import type { Process } from "./types.ts";
import { MAX_ROWS } from "./constants.ts";

export type CsvImportResult =
  | { ok: true; processes: Process[] }
  | { ok: false; errors: string[] };

/** @deprecated Use CsvImportResult */
export type TsvImportResult = CsvImportResult;

const INT_RE = /^-?\d+$/;
const ID_RE = /^[A-Za-z]+$/;
const MAX_NUM = 999;

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseStrictInt(raw: string, label: string, row: number): { ok: true; value: number } | { ok: false; error: string } {
  const s = raw.trim();
  if (s === "") return { ok: false, error: `Row ${row}: ${label} is empty` };
  if (!INT_RE.test(s)) {
    return { ok: false, error: `Row ${row}: ${label} must be a whole number (no text, decimals, or symbols) — got "${raw.trim()}"` };
  }
  const n = Number(s);
  if (!Number.isSafeInteger(n)) {
    return { ok: false, error: `Row ${row}: ${label} is out of range` };
  }
  if (n > MAX_NUM) {
    return { ok: false, error: `Row ${row}: ${label} cannot exceed ${MAX_NUM}` };
  }
  return { ok: true, value: n };
}

/**
 * Parse comma-separated process data (no headers).
 * Columns: Process, Burst, Arrival [, Priority]
 * Priority column must be absent for all rows OR present on every row.
 */
export function parseProcessCsv(text: string): CsvImportResult {
  const errors: string[] = [];
  const raw = stripBom(String(text ?? ""));
  if (!raw.trim()) {
    return { ok: false, errors: ["File is empty"] };
  }

  const lines = raw.split(/\r?\n/);
  const rows: string[][] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (line.includes("\t") && !line.includes(",")) {
      errors.push(`Row ${i + 1}: use comma separators (not tabs)`);
      continue;
    }
    const cells = line.split(",").map((c) => c.trim());
    while (cells.length && cells[cells.length - 1] === "" && cells.length > 4) {
      cells.pop();
    }
    rows.push(cells);
  }

  if (errors.length) return { ok: false, errors };

  if (!rows.length) {
    return { ok: false, errors: ["No process rows found"] };
  }
  if (rows.length > MAX_ROWS) {
    return { ok: false, errors: [`Too many processes (${rows.length}). Maximum is ${MAX_ROWS}`] };
  }

  const first = rows[0].map((c) => c.toLowerCase());
  const headerish = ["process", "burst", "arrival", "priority", "name", "bt", "at"];
  if (first.some((c) => headerish.includes(c))) {
    return {
      ok: false,
      errors: [
        "Header row detected — omit column names. Use raw values only (e.g. A,6,13).",
      ],
    };
  }

  const widths = new Set(rows.map((r) => r.length));
  if (widths.size > 1) {
    return {
      ok: false,
      errors: [
        `Inconsistent column counts across rows (found ${[...widths].sort((a, b) => a - b).join(", ")}). ` +
          `Every row must have the same columns: Process, Burst, Arrival[, Priority]`,
      ],
    };
  }

  const width = rows[0].length;
  if (width < 3) {
    return {
      ok: false,
      errors: [`Expected at least 3 columns (Process, Burst, Arrival); found ${width}`],
    };
  }
  if (width > 4) {
    return {
      ok: false,
      errors: [`Expected at most 4 columns (Process, Burst, Arrival, Priority); found ${width}`],
    };
  }
  const hasPriority = width === 4;

  const processes: Process[] = [];
  const nameSeen = new Map<string, number>();
  const priSeen = new Map<number, number>();

  rows.forEach((cells, idx) => {
    const row = idx + 1;
    if (cells.some((c) => c === "")) {
      errors.push(`Row ${row}: every column must be filled (no empty cells)`);
      return;
    }

    const idRaw = cells[0];
    if (!ID_RE.test(idRaw)) {
      errors.push(`Row ${row}: process name must be letters only (A, B, …, Z, AA, …) — got "${idRaw}"`);
      return;
    }
    const id = idRaw.toUpperCase();
    if (nameSeen.has(id)) {
      errors.push(`Row ${row}: duplicate process name "${id}" (also on row ${nameSeen.get(id)})`);
    } else {
      nameSeen.set(id, row);
    }

    const burstRes = parseStrictInt(cells[1], "Burst", row);
    if (!burstRes.ok) {
      errors.push(burstRes.error);
      return;
    }
    if (burstRes.value < 1) {
      errors.push(`Row ${row}: Burst must be ≥ 1 (zero/negative not allowed)`);
      return;
    }

    const arrRes = parseStrictInt(cells[2], "Arrival", row);
    if (!arrRes.ok) {
      errors.push(arrRes.error);
      return;
    }
    if (arrRes.value < 0) {
      errors.push(`Row ${row}: Arrival cannot be negative`);
      return;
    }

    let pri = idx + 1;
    if (hasPriority) {
      const priRes = parseStrictInt(cells[3], "Priority", row);
      if (!priRes.ok) {
        errors.push(priRes.error);
        return;
      }
      if (priRes.value < 1) {
        errors.push(`Row ${row}: Priority must be ≥ 1 (zero/negative not allowed)`);
        return;
      }
      if (priSeen.has(priRes.value)) {
        errors.push(
          `Row ${row}: duplicate priority ${priRes.value} (also on row ${priSeen.get(priRes.value)})`,
        );
      } else {
        priSeen.set(priRes.value, row);
      }
      pri = priRes.value;
    }

    processes.push({
      id,
      burst: burstRes.value,
      arr: arrRes.value,
      pri,
    });
  });

  if (errors.length) return { ok: false, errors };
  if (!processes.length) return { ok: false, errors: ["No valid processes parsed"] };

  return { ok: true, processes };
}

/** @deprecated Use parseProcessCsv */
export const parseProcessTsv = parseProcessCsv;

export async function readProcessCsvFile(file: File): Promise<CsvImportResult> {
  if (!file) return { ok: false, errors: ["No file selected"] };
  if (file.size === 0) return { ok: false, errors: ["File is empty"] };
  if (file.size > 100_000) return { ok: false, errors: ["File is too large (max 100 KB)"] };
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, errors: ["Could not read file"] };
  }
  return parseProcessCsv(text);
}

/** @deprecated Use readProcessCsvFile */
export const readProcessTsvFile = readProcessCsvFile;
