import AdmZip from "adm-zip";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import path from "path";
import { dumpDatabaseSql } from "./sql-dump";
import { sqlite } from "@/lib/db";

export const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");
export const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");

export function backupTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/** Human-friendly, filename-safe timestamp: 2026-07-05_21-04-33 */
export function backupFileTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  );
}

export function createSqlBackupBuffer(): Buffer {
  return Buffer.from(dumpDatabaseSql(sqlite), "utf8");
}

export function createFullBackupBuffer(): Buffer {
  const zip = new AdmZip();
  zip.addFile("database.sql", createSqlBackupBuffer());

  if (existsSync(UPLOADS_ROOT)) {
    zip.addLocalFolder(UPLOADS_ROOT, "uploads");
  }

  return zip.toBuffer();
}

export function getUploadsSummary() {
  if (!existsSync(UPLOADS_ROOT)) {
    return { fileCount: 0, totalBytes: 0 };
  }

  let fileCount = 0;
  let totalBytes = 0;

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
      } else {
        fileCount++;
        totalBytes += stats.size;
      }
    }
  }

  walk(UPLOADS_ROOT);
  return { fileCount, totalBytes };
}

export function savePreRestoreSnapshot(): string {
  mkdirSync(BACKUPS_DIR, { recursive: true });
  const stamp = backupTimestamp();
  const snapshotDir = path.join(BACKUPS_DIR, `pre-restore-${stamp}`);
  mkdirSync(snapshotDir, { recursive: true });

  const sqlPath = path.join(snapshotDir, "database.sql");
  const uploadsPath = path.join(snapshotDir, "uploads");

  writeFileSync(sqlPath, createSqlBackupBuffer());

  if (existsSync(UPLOADS_ROOT)) {
    cpSync(UPLOADS_ROOT, uploadsPath, { recursive: true });
  }

  return snapshotDir;
}

export function restoreUploadsFromDirectory(sourceDir: string) {
  if (!existsSync(sourceDir)) return;

  mkdirSync(path.dirname(UPLOADS_ROOT), { recursive: true });
  rmSync(UPLOADS_ROOT, { recursive: true, force: true });
  cpSync(sourceDir, UPLOADS_ROOT, { recursive: true });
}

export function extractFullBackupZip(buffer: Buffer): { sql: string; uploadsDir: string | null } {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  const sqlEntry = entries.find((entry) => entry.entryName === "database.sql");
  if (!sqlEntry) {
    throw new Error("Backup archive is missing database.sql");
  }

  const tempRoot = path.join(BACKUPS_DIR, `restore-${backupTimestamp()}`);
  mkdirSync(tempRoot, { recursive: true });
  zip.extractAllTo(tempRoot, true);

  const uploadsDir = path.join(tempRoot, "uploads");
  const sql = zip.readAsText("database.sql");

  return {
    sql,
    uploadsDir: existsSync(uploadsDir) ? uploadsDir : null,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
