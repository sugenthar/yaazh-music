import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import env from "../config/env";
import { getDb } from "../config/database";
import { logger } from "../utils/logger";
import { metrics } from "../services/metrics";

let backupTimer: NodeJS.Timeout | null = null;

export const setupBackupSchedule = (intervalHours?: number): void => {
  stopBackupSchedule();
  const intervalMs = (intervalHours || env.backupIntervalHours) * 60 * 60 * 1000;
  backupTimer = setInterval(() => {
    createBackupWithRotation().catch((err) => {
      logger.error("backup.scheduled.failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
    });
  }, intervalMs);
  backupTimer.unref();
  logger.info("backup.schedule.started", {
    intervalHours: intervalHours || env.backupIntervalHours,
    dir: env.backupDir,
  });
};

export const stopBackupSchedule = (): void => {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
};

export interface BackupResult {
  path: string;
  sizeBytes: number;
  createdAt: string;
  durationMs: number;
}

export interface RestoreResult {
  path: string;
  restoredVersion: number;
  rowCount: number;
}

const BACKUP_NAME_PREFIX = "yaazh-backup";

const listBackupFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(BACKUP_NAME_PREFIX) && name.endsWith(".db"))
    .sort()
    .map((name) => path.join(dir, name));
};

/**
 * Create a consistent online backup of the SQLite database using the native
 * SQLite backup API (works safely while the DB is open and in WAL mode).
 */
export const createBackup = async (dir?: string): Promise<BackupResult> => {
  const backupDir = dir || env.backupDir;
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = `${BACKUP_NAME_PREFIX}-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().split("-")[0]}.db`;
  const destPath = path.join(backupDir, filename);

  const database = getDb();
  const started = Date.now();

  await new Promise<void>((resolve, reject) => {
    database
      .backup(destPath)
      .then(() => resolve())
      .catch((err: Error) => reject(err));
  });

  const sizeBytes = fs.statSync(destPath).size;
  const durationMs = Date.now() - started;
  const createdAt = new Date().toISOString();

  metrics.recordBackupCreated(sizeBytes);

  logger.info("backup.created", {
    path: destPath,
    sizeBytes,
    durationMs,
    createdAt,
  });

  return { path: destPath, sizeBytes, createdAt, durationMs };
};

const rotate = (dir: string, retentionDays: number): number => {
  if (!fs.existsSync(dir)) return 0;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const file of listBackupFiles(dir)) {
    const stat = fs.statSync(file);
    if (stat.mtimeMs < cutoff) {
      try {
        fs.unlinkSync(file);
        removed += 1;
        logger.info("backup.rotated", { path: file, ageMs: Date.now() - stat.mtimeMs });
      } catch (err) {
        logger.error("backup.rotation.failed", {
          path: file,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }
  return removed;
};

/**
 * Create a backup then prune backups older than the retention window.
 * Returns the created backup result; rotation count is returned as well.
 */
export const createBackupWithRotation = async (
  opts?: { dir?: string; retentionDays?: number }
): Promise<{ result: BackupResult; pruned: number }> => {
  const result = await createBackup(opts?.dir);
  const pruned = rotate(opts?.dir || env.backupDir, opts?.retentionDays || env.backupRetentionDays);
  return { result, pruned };
};

const integrityOk = (backupPath: string): boolean => {
  let check: Database.Database | null = null;
  try {
    check = new Database(backupPath, { readonly: true });
    const row = check.pragma("integrity_check", { simple: false }) as Array<{
      integrity_check: string;
    }>;
    return row.length > 0 && row.every((r) => r.integrity_check === "ok");
  } catch (err) {
    logger.error("backup.integrity.check_failed", {
      path: backupPath,
      error: err instanceof Error ? err.message : "unknown",
    });
    return false;
  } finally {
    if (check) {
      try {
        check.close();
      } catch {
        /* ignore */
      }
    }
  }
};

/**
 * Restore the production database from a backup file. Requires the live DB to
 * be closed first (caller is responsible via closeDb()). The current database
 * file is replaced by a copy of the backup, then re-validated.
 */
export const restoreFromBackup = async (backupPath: string): Promise<RestoreResult> => {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  if (!integrityOk(backupPath)) {
    throw new Error(`Backup integrity check failed: ${backupPath}`);
  }

  const dbDir = path.dirname(env.dbPath);
  if (dbDir && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const tmpPath = `${env.dbPath}.restore-${Date.now()}`;
  fs.copyFileSync(backupPath, tmpPath);

  for (const ext of ["", "-wal", "-shm"]) {
    const target = `${env.dbPath}${ext}`;
    if (fs.existsSync(target)) {
      try {
        fs.unlinkSync(target);
      } catch (err) {
        logger.error("backup.restore.unlink_failed", {
          path: target,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  fs.renameSync(tmpPath, env.dbPath);

  const restored = getDb();
  restored.pragma("wal_checkpoint(TRUNCATE)");

  const rowCount = (
    restored
      .prepare(
        "SELECT (SELECT COUNT(*) FROM users) + (SELECT COUNT(*) FROM playlists) + (SELECT COUNT(*) FROM likes) + (SELECT COUNT(*) FROM listening_history) + (SELECT COUNT(*) FROM moods) AS total"
      )
      .get() as { total: number }
  ).total;

  const restoredVersion = restored.pragma("user_version", { simple: true }) as number;

  logger.info("backup.restored", {
    from: backupPath,
    rowCount,
    restoredVersion,
  });

  metrics.recordBackupRestored(rowCount);

  return { path: backupPath, restoredVersion, rowCount };
};
