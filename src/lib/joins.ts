import type {
  CanvasTable,
  CatalogField,
  DataSource,
  Join,
  QueryGroup,
  SelectColumn,
  SortColumn,
} from "./types";
import { generateWhere } from "./sql";

type Row = Record<string, unknown>;

export interface ResolvedTable extends CanvasTable {
  source: DataSource;
}

/** Attach the DataSource to each canvas table; drops tables whose source is gone. */
export function resolveTables(tables: CanvasTable[], sources: DataSource[]): ResolvedTable[] {
  return tables
    .map((t) => {
      const source = sources.find((s) => s.id === t.sourceId);
      return source ? { ...t, source } : null;
    })
    .filter((t): t is ResolvedTable => t !== null);
}

/** Build the flattened "alias.field" catalog across all placed tables. */
export function buildCatalog(tables: ResolvedTable[]): CatalogField[] {
  const out: CatalogField[] = [];
  for (const t of tables) {
    for (const f of t.source.fields) {
      out.push({
        key: `${t.alias}.${f.name}`,
        label: `${t.alias}.${f.name}`,
        type: f.type,
        tableId: t.id,
        alias: t.alias,
        field: f.name,
        options: f.options,
      });
    }
  }
  return out;
}

/** Prefix a single source row's keys with the table alias. */
function prefixRow(row: Row, alias: string, source: DataSource): Row {
  const out: Row = {};
  for (const f of source.fields) out[`${alias}.${f.name}`] = row[f.name];
  return out;
}

function nullRow(alias: string, source: DataSource): Row {
  const out: Row = {};
  for (const f of source.fields) out[`${alias}.${f.name}`] = null;
  return out;
}

/**
 * Execute the joins in-memory, returning the flattened joined dataset.
 * Tables are incorporated in canvas order; each table after the first must be
 * linked by a join to an already-included table. INNER and LEFT are exact;
 * RIGHT is handled by swapping sides; FULL adds unmatched right rows.
 */
export function buildJoinedRows(tables: ResolvedTable[], joins: Join[]): Row[] {
  if (tables.length === 0) return [];

  const [first, ...rest] = tables;
  let acc: Row[] = first.source.rows.map((r) => prefixRow(r, first.alias, first.source));
  const included = new Set<string>([first.id]);

  for (const table of rest) {
    const join = joins.find(
      (j) =>
        (j.leftTableId === table.id && included.has(j.rightTableId)) ||
        (j.rightTableId === table.id && included.has(j.leftTableId))
    );

    const tableRows = table.source.rows.map((r) => prefixRow(r, table.alias, table.source));

    if (!join) {
      // No join defined yet → cross join (Cartesian) so the table still appears.
      const next: Row[] = [];
      for (const a of acc) for (const b of tableRows) next.push({ ...a, ...b });
      acc = next;
      included.add(table.id);
      continue;
    }

    // Orient the condition so "existing" side is the accumulator.
    const newIsLeft = join.leftTableId === table.id;
    const existingAlias = newIsLeft
      ? aliasOf(tables, join.rightTableId)
      : aliasOf(tables, join.leftTableId);
    const existingField = newIsLeft ? join.rightField : join.leftField;
    const newField = newIsLeft ? join.leftField : join.rightField;

    const existingKey = `${existingAlias}.${existingField}`;
    const newKey = `${table.alias}.${newField}`;

    // index new table rows by join key
    const index = new Map<unknown, Row[]>();
    for (const b of tableRows) {
      const k = b[newKey];
      const bucket = index.get(k);
      if (bucket) bucket.push(b);
      else index.set(k, [b]);
    }

    const keepUnmatchedLeft = join.type === "LEFT" || join.type === "FULL";
    const keepUnmatchedRight = join.type === "RIGHT" || join.type === "FULL";
    const matchedNew = new Set<Row>();
    const next: Row[] = [];

    for (const a of acc) {
      const matches = index.get(a[existingKey]) ?? [];
      if (matches.length === 0) {
        if (keepUnmatchedLeft) next.push({ ...a, ...nullRow(table.alias, table.source) });
      } else {
        for (const b of matches) {
          next.push({ ...a, ...b });
          matchedNew.add(b);
        }
      }
    }

    if (keepUnmatchedRight) {
      const blankExisting = blankAccRow(acc[0]);
      for (const b of tableRows) {
        if (!matchedNew.has(b)) next.push({ ...blankExisting, ...b });
      }
    }

    acc = next;
    included.add(table.id);
  }

  return acc;
}

function blankAccRow(sample: Row | undefined): Row {
  const out: Row = {};
  if (sample) for (const k of Object.keys(sample)) out[k] = null;
  return out;
}

function aliasOf(tables: ResolvedTable[], tableId: string): string {
  return tables.find((t) => t.id === tableId)?.alias ?? "";
}

/* --------------------------------- SQL ---------------------------------- */

function colExpr(c: SelectColumn, alias: string): string {
  const ref = `${alias}.${c.field}`;
  const base = c.aggregate && c.aggregate !== "NONE" ? `${c.aggregate}(${ref})` : ref;
  return c.alias ? `${base} AS ${c.alias}` : base;
}

export interface SqlParts {
  sql: string;
}

/** Generate a full multi-table SELECT with JOINs, WHERE, GROUP BY and ORDER BY. */
export function generateJoinSql(
  tables: ResolvedTable[],
  joins: Join[],
  columns: SelectColumn[],
  conditionRoot: QueryGroup,
  catalogSource: DataSource,
  sorts: SortColumn[]
): string {
  if (tables.length === 0) return "-- Add a table from the navigator to begin.";

  const aliasById = new Map(tables.map((t) => [t.id, t.alias]));

  // SELECT
  const selectList =
    columns.length === 0
      ? "*"
      : columns
          .map((c) => colExpr(c, aliasById.get(c.tableId) ?? "?"))
          .join(",\n  ");

  // FROM + JOINs (tables in canvas order)
  const [first, ...rest] = tables;
  let from = `FROM ${first.source.id} ${first.alias}`;
  const placed = new Set<string>([first.id]);

  for (const t of rest) {
    const join = joins.find(
      (j) =>
        (j.leftTableId === t.id && placed.has(j.rightTableId)) ||
        (j.rightTableId === t.id && placed.has(j.leftTableId))
    );
    if (join) {
      const lA = aliasById.get(join.leftTableId) ?? "?";
      const rA = aliasById.get(join.rightTableId) ?? "?";
      from += `\n${join.type} JOIN ${t.source.id} ${t.alias} ON ${lA}.${join.leftField} = ${rA}.${join.rightField}`;
    } else {
      from += `\nCROSS JOIN ${t.source.id} ${t.alias}`;
    }
    placed.add(t.id);
  }

  const where = generateWhere(conditionRoot, catalogSource);

  // GROUP BY when aggregates are mixed with plain columns
  const hasAgg = columns.some((c) => c.aggregate && c.aggregate !== "NONE");
  const plainCols = columns.filter((c) => !c.aggregate || c.aggregate === "NONE");
  const groupBy =
    hasAgg && plainCols.length > 0
      ? plainCols.map((c) => `${aliasById.get(c.tableId) ?? "?"}.${c.field}`).join(", ")
      : null;

  const orderBy =
    sorts.length > 0
      ? sorts.map((s) => `${aliasById.get(s.tableId) ?? "?"}.${s.field} ${s.dir}`).join(", ")
      : null;

  let sql = `SELECT\n  ${selectList}\n${from}`;
  if (where) sql += `\nWHERE ${where}`;
  if (groupBy) sql += `\nGROUP BY ${groupBy}`;
  if (orderBy) sql += `\nORDER BY ${orderBy}`;
  return sql + ";";
}
