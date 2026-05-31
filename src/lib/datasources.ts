import type { DataSource } from "./types";

/**
 * Mock data sources. Each carries a schema and a sample dataset used by the
 * execution simulator. Schemas drive which inputs and operators the UI renders.
 */

const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "USA", "UK"];
const STATUSES = ["active", "inactive", "pending", "banned"];

function makeUsers(n: number): Record<string, unknown>[] {
  const names = ["Ada", "Bola", "Chidi", "Dayo", "Emeka", "Funke", "Grace", "Halima", "Ibrahim", "Joy"];
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      id: i + 1,
      name: `${names[i % names.length]} ${String.fromCharCode(65 + (i % 26))}.`,
      age: 18 + ((i * 7) % 45),
      country: COUNTRIES[i % COUNTRIES.length],
      status: STATUSES[i % STATUSES.length],
      purchases: (i * 3) % 40,
      verified: i % 2 === 0,
      createdAt: `2023-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
    });
  }
  return rows;
}

function makeProducts(n: number): Record<string, unknown>[] {
  const cats = ["electronics", "books", "clothing", "food", "toys"];
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      sku: `SKU-${1000 + i}`,
      title: `Product ${i + 1}`,
      category: cats[i % cats.length],
      price: 5 + ((i * 13) % 500),
      stock: (i * 11) % 200,
      inStock: (i * 11) % 200 > 0,
      releasedAt: `2022-${String((i % 12) + 1).padStart(2, "0")}-15`,
    });
  }
  return rows;
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: "users",
    name: "Users",
    fields: [
      { name: "id", label: "ID", type: "number" },
      { name: "name", label: "Name", type: "string" },
      { name: "age", label: "Age", type: "number" },
      { name: "country", label: "Country", type: "enum", options: COUNTRIES },
      { name: "status", label: "Status", type: "enum", options: STATUSES },
      { name: "purchases", label: "Purchases", type: "number" },
      { name: "verified", label: "Verified", type: "boolean" },
      { name: "createdAt", label: "Created At", type: "date" },
    ],
    rows: makeUsers(200),
  },
  {
    id: "products",
    name: "Products",
    fields: [
      { name: "sku", label: "SKU", type: "string" },
      { name: "title", label: "Title", type: "string" },
      { name: "category", label: "Category", type: "enum", options: ["electronics", "books", "clothing", "food", "toys"] },
      { name: "price", label: "Price", type: "number" },
      { name: "stock", label: "Stock", type: "number" },
      { name: "inStock", label: "In Stock", type: "boolean" },
      { name: "releasedAt", label: "Released At", type: "date" },
    ],
    rows: makeProducts(200),
  },
];

export function getDataSource(id: string): DataSource | undefined {
  return DATA_SOURCES.find((s) => s.id === id);
}
