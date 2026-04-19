const DATABASE_URL = String(Deno.env.get("DATABASE_URL") || "").trim();

let poolPromise: Promise<import("npm:pg").Pool | null> | null = null;
const initializedTables = new Set<string>();

function sanitizeIdentifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return value;
}

async function getPool(): Promise<import("npm:pg").Pool | null> {
  if (!DATABASE_URL) return null;
  if (!poolPromise) {
    poolPromise = import("npm:pg")
      .then(({ Pool }) => new Pool({
        connectionString: DATABASE_URL,
        max: 3,
        idleTimeoutMillis: 30000,
      }))
      .catch((error) => {
        console.error("[postgres-store] Failed to initialize Postgres pool", error);
        return null;
      });
  }
  return poolPromise;
}

async function ensureTable(tableName: string): Promise<import("npm:pg").Pool | null> {
  const pool = await getPool();
  if (!pool) return null;
  const safeTable = sanitizeIdentifier(tableName);
  if (initializedTables.has(safeTable)) return pool;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${safeTable} (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      data JSONB NOT NULL
    )
  `);
  initializedTables.add(safeTable);
  return pool;
}

export function isPostgresStoreEnabled(): boolean {
  return !!DATABASE_URL;
}

export async function readJsonStore<T>(tableName: string): Promise<T[] | null> {
  const pool = await ensureTable(tableName);
  if (!pool) return null;
  const safeTable = sanitizeIdentifier(tableName);
  const result = await pool.query(`SELECT data FROM ${safeTable} ORDER BY created_at DESC, id ASC`);
  return result.rows.map((row) => row.data as T);
}

export async function writeJsonStore<T extends { id: string; created_at?: string }>(tableName: string, records: T[]): Promise<boolean> {
  const pool = await ensureTable(tableName);
  if (!pool) return false;
  const safeTable = sanitizeIdentifier(tableName);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM ${safeTable}`);
    for (const record of records) {
      const createdAt = String(record?.created_at || new Date().toISOString());
      await client.query(
        `INSERT INTO ${safeTable} (id, created_at, data) VALUES ($1, $2::timestamptz, $3::jsonb)`,
        [String(record.id), createdAt, JSON.stringify(record)],
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {
      // ignore rollback failure
    });
    throw error;
  } finally {
    client.release();
  }
}
