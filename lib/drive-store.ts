import "server-only";
import {
  readGoogleDriveJsonDocument,
  updateGoogleDriveJsonFile,
  createGoogleDriveJsonFile,
  isGoogleDriveConfigured,
} from "@/lib/google-drive";

export const DRIVE_TABLES = [
  "admin_users",
  "business_profile",
  "services",
  "team_members",
  "work_items",
  "reviews",
  "hero_images",
  "contact_submissions",
  "user_reviews",
  "site_visitors",
  "site_visit_events",
] as const;

export type DriveTableName = (typeof DRIVE_TABLES)[number];
export type DriveRow = Record<string, unknown>;
export interface DriveTableDocument {
  formatVersion: 2;
  table: DriveTableName;
  rows: DriveRow[];
  nextId: number;
  updatedAt: string;
}

const DEFAULT_ROWS: Partial<Record<DriveTableName, DriveRow[]>> = {
  hero_images: [
    { slot: "banner", label: "Main banner", image_url: null, sort_order: 0, updated_at: new Date(0).toISOString() },
    { slot: "process-1", label: "Process — Consultation", image_url: null, sort_order: 1, updated_at: new Date(0).toISOString() },
    { slot: "process-2", label: "Process — Color & Finish Plan", image_url: null, sort_order: 2, updated_at: new Date(0).toISOString() },
    { slot: "process-3", label: "Process — Surface Preparation", image_url: null, sort_order: 3, updated_at: new Date(0).toISOString() },
    { slot: "process-4", label: "Process — Execution", image_url: null, sort_order: 4, updated_at: new Date(0).toISOString() },
    { slot: "process-5", label: "Process — Final Review", image_url: null, sort_order: 5, updated_at: new Date(0).toISOString() },
  ],
};

const NUMERIC_ID_TABLES = new Set<DriveTableName>([
  "admin_users", "team_members", "work_items", "reviews", "contact_submissions", "user_reviews", "site_visit_events",
]);
const FILE_PREFIX = () => process.env.GOOGLE_DRIVE_FILE_PREFIX?.trim() || "rongdhonu-db-";
const documentName = (table: DriveTableName) => `${FILE_PREFIX()}${table}.json`;
const locks = new Map<DriveTableName, Promise<unknown>>();

function nextIdFromRows(rows: DriveRow[]): number {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

function normalizeDocument(table: DriveTableName, raw: unknown): DriveTableDocument {
  if (raw && typeof raw === "object" && "rows" in raw && Array.isArray((raw as { rows?: unknown }).rows)) {
    const value = raw as Partial<DriveTableDocument>;
    const rows = value.rows as DriveRow[];
    return {
      formatVersion: 2,
      table,
      rows,
      nextId: Number.isInteger(value.nextId) && Number(value.nextId) > 0 ? Number(value.nextId) : nextIdFromRows(rows),
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    };
  }
  if (Array.isArray(raw)) {
    return { formatVersion: 2, table, rows: raw as DriveRow[], nextId: nextIdFromRows(raw as DriveRow[]), updatedAt: new Date().toISOString() };
  }
  return { formatVersion: 2, table, rows: [...(DEFAULT_ROWS[table] ?? [])], nextId: 1, updatedAt: new Date().toISOString() };
}

async function getDocument(table: DriveTableName): Promise<{ id: string; document: DriveTableDocument } | null> {
  const existing = await readGoogleDriveJsonDocument<unknown>(documentName(table));
  if (!existing) return null;
  return { id: existing.file.id, document: normalizeDocument(table, existing.value) };
}

async function saveDocument(table: DriveTableName, document: DriveTableDocument, fileId?: string): Promise<void> {
  const name = documentName(table);
  document.formatVersion = 2;
  document.table = table;
  document.updatedAt = new Date().toISOString();
  if (fileId) await updateGoogleDriveJsonFile(fileId, document);
  else await createGoogleDriveJsonFile(name, document);
}

/** Reads a complete Google Drive-backed table. Values are returned in the same snake_case shape as the stored snake_case values. */
export async function readTable<T extends DriveRow = DriveRow>(table: DriveTableName): Promise<T[]> {
  const current = await getDocument(table);
  return (current?.document.rows ?? [...(DEFAULT_ROWS[table] ?? [])]).map((row) => ({ ...row })) as T[];
}

/**
 * Serializes table mutations within one Node.js process. Google Drive is not a transactional data store;
 * distributed/serverless concurrent writers are not globally serialized. Deploy as one persistent Node
 * process for best results, keep backups, and avoid high-volume writes.
 */
export async function mutateTable<T>(table: DriveTableName, mutate: (document: DriveTableDocument) => T): Promise<T> {
  const prior = locks.get(table) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const chain = prior.then(() => gate);
  locks.set(table, chain);
  await prior.catch(() => undefined);
  try {
    const current = await getDocument(table);
    const document = current?.document ?? normalizeDocument(table, null);
    const result = mutate(document);
    await saveDocument(table, document, current?.id);
    return result;
  } finally {
    release();
    if (locks.get(table) === chain) locks.delete(table);
  }
}

export function allocateId(document: DriveTableDocument): number {
  const table = document.table;
  if (!NUMERIC_ID_TABLES.has(table)) throw new Error(`Table ${table} does not use numeric IDs.`);
  const id = Math.max(document.nextId, nextIdFromRows(document.rows));
  document.nextId = id + 1;
  return id;
}

export function timestamp(): string {
  return new Date().toISOString();
}

export function findById<T extends DriveRow = DriveRow>(table: DriveTableName, id: string | number): Promise<T | null> {
  const value = String(id);
  return readTable<T>(table).then((rows) => rows.find((row) => String(row.id ?? row.slot ?? row.visitor_id) === value) ?? null);
}

export async function checkGoogleDriveStore(): Promise<{ configured: boolean; tables: Array<{ table: DriveTableName; rows: number; fileFound: boolean }> }> {
  const checks = await Promise.all(DRIVE_TABLES.map(async (table) => {
    const document = await getDocument(table);
    return { table, rows: document?.document.rows.length ?? DEFAULT_ROWS[table]?.length ?? 0, fileFound: Boolean(document) };
  }));
  return { configured: isGoogleDriveConfigured(), tables: checks };
}
