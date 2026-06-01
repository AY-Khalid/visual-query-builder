import type {
  CatalogField,
  DataSource,
  QueryGroup,
  SelectColumn,
  SortColumn,
} from "./types";
import { executeQuery } from "./execute";
import type { ResolvedTable } from "./joins";

type Row = Record<string, unknown>;

/** Build a synthetic DataSource over the flattened catalog so the existing
 *  condition engine (validation / WHERE / filtering) works unchanged. */
export function buildCatalogSource(catalog: CatalogField[], joinedRows: Row[]): DataSource {
  return {
    id: "__catalog__",
    name: "Joined",
    fields: catalog.map((c) => ({
      name: c.key,
      label: c.label,
      type: c.type,
      ...(c.type === "enum" ? { options: uniqueStrings(joinedRows, c.key) } : {}),
    })),
    rows: joinedRows,
  };
}

function uniqueStrings(rows: Row[], key: string): string[] {
  return Array.from(new Set(rows.map((r) => String(r[key] ?? "")).filter(Boolean))).slice(0, 50);
}

export interface ProjectedResult {
  columns: { key: string; label: string }[];
  rows: Row[];
  total: number;
}

function aggregate(agg: string, values: unknown[]): unknown {
  const nums = values.map(Number).filter((n) => !Number.isNaN(n));
  switch (agg) {
    case "COUNT":
      return values.length;
    case "SUM":
      return nums.reduce((a, b) => a + b, 0);
    case "AVG":
      return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : null;
    case "MIN":
      return nums.length ? Math.min(...nums) : null;
    case "MAX":
      return nums.length ? Math.max(...nums) : null;
    default:
      return values[0];
  }
}

/**
 * Filter the joined rows by the condition tree, then project the selected
 * columns (applying aggregation + grouping if any aggregate is present),
 * then sort.
 */
export function executeJoinQuery(
  tables: ResolvedTable[],
  catalog: CatalogField[],
  joinedRows: Row[],
  columns: SelectColumn[],
  conditionRoot: QueryGroup,
  sorts: SortColumn[]
): ProjectedResult {
  const aliasById = new Map(tables.map((t) => [t.id, t.alias]));
  const catalogSource = buildCatalogSource(catalog, joinedRows);
  const { rows: filtered } = executeQuery(conditionRoot, catalogSource);

  // Resolve which catalog keys to output.
  const outCols =
    columns.length === 0
      ? catalog.map((c) => ({ key: c.key, label: c.label, agg: "NONE" as string, outKey: c.key }))
      : columns.map((c) => {
          const a = aliasById.get(c.tableId) ?? "?";
          const key = `${a}.${c.field}`;
          const outKey = c.alias || (c.aggregate !== "NONE" ? `${c.aggregate}(${key})` : key);
          return { key, label: outKey, agg: c.aggregate as string, outKey };
        });

  const hasAgg = outCols.some((c) => c.agg !== "NONE");
  let resultRows: Row[];

  if (!hasAgg) {
    resultRows = filtered.map((r) => {
      const o: Row = {};
      for (const c of outCols) o[c.outKey] = r[c.key];
      return o;
    });
  } else {
    const groupCols = outCols.filter((c) => c.agg === "NONE");
    const groups = new Map<string, Row[]>();
    for (const r of filtered) {
      const gk = groupCols.map((c) => String(r[c.key])).join("");
      const bucket = groups.get(gk);
      if (bucket) bucket.push(r);
      else groups.set(gk, [r]);
    }
    resultRows = Array.from(groups.values()).map((bucket) => {
      const o: Row = {};
      for (const c of outCols) {
        o[c.outKey] = c.agg === "NONE" ? bucket[0][c.key] : aggregate(c.agg, bucket.map((b) => b[c.key]));
      }
      return o;
    });
  }

  // sort (map sort fields to their output keys when present, else raw key)
  if (sorts.length > 0) {
    resultRows = [...resultRows].sort((a, b) => {
      for (const s of sorts) {
        const a2 = aliasById.get(s.tableId) ?? "?";
        const key = `${a2}.${s.field}`;
        const av = a[key] ?? a[s.field];
        const bv = b[key] ?? b[s.field];
        if (av === bv) continue;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return (av < bv ? -1 : 1) * (s.dir === "DESC" ? -1 : 1);
      }
      return 0;
    });
  }

  return {
    columns: outCols.map((c) => ({ key: c.outKey, label: c.label })),
    rows: resultRows,
    total: resultRows.length,
  };
}
