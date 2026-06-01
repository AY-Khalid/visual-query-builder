import type { DataSource, FieldType, SchemaField } from "./types";

/**
 * Minimal, dependency-free CSV parser supporting quoted fields, escaped quotes
 * ("") and commas/newlines inside quotes. Good enough for importing tabular
 * data to build an ad-hoc table.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  // flush trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ""));
}

// Recognises ISO (YYYY-MM-DD, optional time), and slash formats (YYYY/MM/DD,
// MM/DD/YYYY or DD/MM/YYYY).
const DATE_RE =
  /^(\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?|\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4})$/;

/** Infer a column's field type from a sample of string values. */
function inferType(values: string[]): FieldType {
  const sample = values.filter((v) => v !== "" && v != null);
  if (sample.length === 0) return "string";

  const allBool = sample.every((v) => /^(true|false)$/i.test(v.trim()));
  if (allBool) return "boolean";

  const allNum = sample.every((v) => v.trim() !== "" && !Number.isNaN(Number(v)));
  if (allNum) return "number";

  const allDate = sample.every((v) => DATE_RE.test(v.trim()));
  if (allDate) return "date";

  // enum if low cardinality relative to rows
  const unique = new Set(sample.map((v) => v.trim()));
  if (unique.size <= 12 && unique.size < sample.length / 2 && sample.length >= 6) {
    return "enum";
  }
  return "string";
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "col"
  );
}

function titleCase(name: string): string {
  const clean = name.replace(/[_-]+/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export interface CsvImportResult {
  source: DataSource;
  rowCount: number;
}

/** Build a DataSource (schema + typed rows) from raw CSV text. */
export function csvToDataSource(text: string, fileName: string): CsvImportResult {
  const grid = parseCsv(text);
  if (grid.length < 1) throw new Error("CSV appears to be empty.");

  const header = grid[0].map((h, i) => h.trim() || `column_${i + 1}`);
  const bodyRows = grid.slice(1);

  // de-duplicate column keys
  const seen = new Map<string, number>();
  const keys = header.map((h) => {
    let key = slugify(h);
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return n === 0 ? key : `${key}_${n + 1}`;
  });

  const fields: SchemaField[] = header.map((label, colIdx) => {
    const colValues = bodyRows.map((r) => r[colIdx] ?? "");
    const type = inferType(colValues);
    const field: SchemaField = { name: keys[colIdx], label: titleCase(label), type };
    if (type === "enum") {
      field.options = Array.from(new Set(colValues.map((v) => v.trim()).filter(Boolean))).slice(0, 50);
    }
    return field;
  });

  const rows: Record<string, unknown>[] = bodyRows.map((r) => {
    const obj: Record<string, unknown> = {};
    fields.forEach((f, colIdx) => {
      const raw = (r[colIdx] ?? "").trim();
      if (f.type === "number") obj[f.name] = raw === "" ? null : Number(raw);
      else if (f.type === "boolean") obj[f.name] = raw === "" ? null : /^true$/i.test(raw);
      else obj[f.name] = raw;
    });
    return obj;
  });

  const baseId = slugify(fileName.replace(/\.csv$/i, "")) || "imported";
  const id = `${baseId}_${Math.random().toString(36).slice(2, 6)}`;

  return {
    source: { id, name: titleCase(baseId), fields, rows },
    rowCount: rows.length,
  };
}
