# Visual Query Builder

A highly interactive, schema-driven **visual query builder** built with Next.js (App Router) and TypeScript. Construct complex, deeply nested database queries through a graphical interface — no raw query syntax required — then preview the generated SQL and execute it against a mock dataset.

Supports nested logic such as:

```sql
SELECT *
FROM users
WHERE (age > 18 AND country = 'Nigeria') OR (status = 'active' AND purchases > 10);
```

---

## ✨ Features

- **Dynamic rule builder** — field / operator / value, with operators: equals, not equals, contains, starts/ends with, greater/less than (and ≥ / ≤), in list, between, regex, is null / is not null.
- **Unlimited nested groups** — AND / OR combinators, NOT inversion, collapsible groups, drag‑and‑drop reordering, add/remove at any depth.
- **Schema-driven UI** — inputs adapt to field type (number input, date picker, enum dropdown, boolean select); invalid operators are hidden per type.
- **Live SQL preview** — regenerates in real time as you build, with a VALID/INVALID badge and one‑click copy.
- **Execution simulator** — filters a 200‑row mock dataset, with result count, loading/empty states, pagination, and column sorting.
- **Validation engine** — surfaces empty groups, missing values, type‑incompatible operators, invalid regex, and inverted `between` ranges.
- **Productivity** — undo/redo history, saved presets, export/import query JSON (sanitized), keyboard shortcuts, dark/light mode, animated transitions.

### Keyboard shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` / `Ctrl + Y` | Redo |
| `Ctrl/Cmd + Enter` | Run query |

---

## 🚀 Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # run the Vitest suite
npm run coverage   # tests + coverage report
npm run build      # production build
```

Requires Node 18.18+ (Node 20/22 recommended).

---

## 🏗️ Architecture

```
src/
├── app/                 # Next.js App Router (layout, page, globals)
├── components/          # UI layer
│   ├── QueryBuilder.tsx # top-level container + derived state
│   ├── GroupNode.tsx    # RECURSIVE group renderer (+ dnd-kit sorting)
│   ├── RuleRow.tsx      # leaf rule (field/operator/value)
│   ├── ValueInput.tsx   # schema-driven value control
│   ├── ResultsTable.tsx # paginated/sortable results
│   ├── SqlPreview.tsx   # live SQL + copy
│   ├── Toolbar.tsx      # source, history, presets, import/export, run
│   └── ThemeToggle.tsx
├── hooks/
│   └── useKeyboardShortcuts.ts
├── lib/                 # framework-agnostic core (fully unit-tested)
│   ├── types.ts         # typed query models
│   ├── operators.ts     # operator registry + type rules
│   ├── datasources.ts   # schemas + mock datasets
│   ├── tree.ts          # immutable recursive tree operations
│   ├── sql.ts           # SQL generator
│   ├── validation.ts    # validation engine
│   ├── execute.ts       # query execution simulator
│   └── serialize.ts     # import/export + sanitization
└── store/
    └── queryStore.ts    # Zustand store + undo/redo + presets
```

### Recursive rendering strategy
The query is a tree of two node kinds: `QueryGroup` (has `children` + a combinator) and `QueryRule` (a leaf). `GroupNode` renders its children and, for any child that is itself a group, **renders another `GroupNode`** — recursion mirrors the data structure, giving unlimited nesting depth for free. Each group scopes its own `DndContext`/`SortableContext`, so drag‑and‑drop reordering stays contained to siblings and never crosses levels unexpectedly. Components are wrapped in `React.memo` and read narrow slices of the store so that editing one rule does not re‑render unrelated branches.

### State management decisions
A single **Zustand** store holds a normalized query tree plus `past`/`future` stacks for undo/redo and a `saved` preset list. All mutations go through pure, **immutable** helpers in `lib/tree.ts` (`mapTree`, `updateNode`, `addChild`, `removeNode`, `reorderChildren`) that rebuild only the path to the changed node and preserve references for untouched branches (structural sharing). UI‑only state (group collapse) is updated without pushing to history. Keeping the tree logic in framework‑agnostic functions makes it trivially unit‑testable and reusable.

### Query engine design
`lib/sql.ts` walks the tree recursively, emitting a WHERE fragment per node, wrapping multi‑child groups in parentheses, applying `NOT`, and **skipping incomplete rules**. String literals are single‑quote escaped to prevent injection in the generated text. `lib/validation.ts` produces a flat list of `{nodeId, message}` issues that the UI maps onto the offending node. `lib/execute.ts` compiles each rule to a predicate and evaluates the tree against the mock dataset with the same recursive shape, so preview and execution stay consistent.

### Performance techniques
- `React.memo` on `GroupNode` and `RuleRow`; selector‑based store subscriptions.
- Derived values (`sql`, validation `issues`, `issueMap`) computed with `useMemo`.
- Immutable updates with structural sharing → minimal re‑renders.
- Stable `key`s (per‑node ids) for list reconciliation and dnd.
- Execution is debounced behind an explicit **Run** action rather than running on every keystroke.

### Security & stability
Imported JSON is parsed and **rebuilt node‑by‑node** by `lib/serialize.ts`: unknown node types are rejected, combinators are whitelisted, nesting depth is capped (prevents stack‑abuse / malformed recursion), strings are length‑limited, and non‑primitive values are dropped. Generated SQL escapes quotes.

### Trade-offs
- **Per‑group DndContext** keeps reorder logic simple and isolated, at the cost of not supporting drag *between* groups (move = remove + add). A single root context with custom collision logic would enable cross‑group drags but adds complexity.
- **SQL‑only preview** was chosen for focus and correctness; the engine is structured so Mongo/GraphQL emitters could be added as sibling modules to `sql.ts`.
- **In‑memory presets/history** (no persistence backend) keep the app self‑contained for the review; localStorage/DB persistence is a natural extension.

---

## 🧪 Testing
Vitest + React Testing Library. Coverage spans query generation, the validation engine, recursive tree operations, the execution simulator, import/export sanitization, the Zustand store, and recursive component rendering/interactions.

```bash
npm test
```

---

## 🌐 Deployment
Continuously deployed on **Vercel**: every push to `main` ships production; every pull request gets a preview deployment.

[**Live URL:**](https://visual-query-builder-xi.vercel.app/)
