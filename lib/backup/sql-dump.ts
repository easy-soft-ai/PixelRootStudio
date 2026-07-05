import type Database from "better-sqlite3";

const BACKUP_HEADER = "-- PixelRoot Studio database backup";

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function dumpDatabaseSql(sqlite: Database.Database): string {
  const lines: string[] = [
    BACKUP_HEADER,
    `-- Generated: ${new Date().toISOString()}`,
    "PRAGMA foreign_keys = OFF;",
    "BEGIN TRANSACTION;",
  ];

  const tables = sqlite
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
       ORDER BY name`
    )
    .all() as { name: string }[];

  for (const { name } of tables) {
    const createRow = sqlite
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(name) as { sql: string } | undefined;

    if (!createRow?.sql) continue;

    lines.push(`DROP TABLE IF EXISTS "${name}";`);
    lines.push(`${createRow.sql};`);

    const columns = sqlite
      .prepare(`PRAGMA table_info("${name}")`)
      .all() as { name: string }[];
    const columnNames = columns.map((column) => `"${column.name}"`).join(", ");

    const rows = sqlite.prepare(`SELECT * FROM "${name}"`).raw().all() as unknown[][];
    for (const row of rows) {
      const values = row.map(sqlLiteral).join(", ");
      lines.push(`INSERT INTO "${name}" (${columnNames}) VALUES (${values});`);
    }
  }

  lines.push("COMMIT;");
  lines.push("PRAGMA foreign_keys = ON;");

  return `${lines.join("\n")}\n`;
}

const ALLOWED_SQL_PATTERN =
  /^\s*(?:--.*|-- PixelRoot|PRAGMA\s+(?:foreign_keys|journal_mode)|BEGIN(?:\s+TRANSACTION)?|COMMIT|ROLLBACK|DROP\s+TABLE\s+IF\s+EXISTS|CREATE\s+TABLE|DELETE\s+FROM|INSERT\s+INTO)/i;

export function validateBackupSql(sql: string): void {
  const trimmed = sql.trim();
  if (!trimmed.startsWith(BACKUP_HEADER)) {
    throw new Error("Invalid backup file. Upload a PixelRoot Studio SQL export.");
  }

  const statements = splitSqlStatements(trimmed);
  for (const statement of statements) {
    const normalized = statement.trim();
    if (!normalized || normalized.startsWith("--")) continue;
    if (!ALLOWED_SQL_PATTERN.test(normalized)) {
      throw new Error(`Unsupported SQL statement in backup: ${normalized.slice(0, 80)}…`);
    }
  }
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    if (char === "'" && sql[i + 1] === "'") {
      current += "''";
      i++;
      continue;
    }

    if (char === "'") {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (char === ";" && !inSingleQuote) {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

export function importDatabaseSql(sqlite: Database.Database, sql: string): void {
  validateBackupSql(sql);

  sqlite.exec("PRAGMA foreign_keys = OFF;");
  try {
    sqlite.exec(sql);
  } finally {
    sqlite.exec("PRAGMA foreign_keys = ON;");
  }

  const integrity = sqlite.pragma("integrity_check", { simple: true }) as string;
  if (integrity !== "ok") {
    throw new Error(`Database integrity check failed: ${integrity}`);
  }
}
