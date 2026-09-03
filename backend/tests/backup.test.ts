import { beforeAll, afterAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

let dbPath: string;
let backupDir: string;
let mods: any;

beforeAll(async () => {
  dbPath = path.join(os.tmpdir(), `yaazh-bak-${Date.now()}.db`);
  backupDir = path.join(os.tmpdir(), `yaazh-bak-dir-${Date.now()}`);
  process.env.DB_PATH = dbPath;
  process.env.BACKUP_DIR = backupDir;
  process.env.NODE_ENV = "test";

  const { getDb, closeDb } = await import("../src/config/database");
  const { userRepository } = await import("../src/repositories");
  const backupMod = await import("../src/services/backup");
  mods = { getDb, closeDb, userRepository, ...backupMod };
});

afterAll(() => {
  for (const p of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }
  fs.rmSync(backupDir, { recursive: true, force: true });
});

describe("backup module", () => {
  it("creates a database seed", () => {
    mods.getDb();
    mods.userRepository.create({ name: "Backup", email: "bak@x.com", passwordHash: "h" });
  });

  it("creates a consistent online backup file", async () => {
    const result = await mods.createBackup();
    expect(fs.existsSync(result.path)).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.path).toContain("yaazh-backup");
  });

  it("createBackupWithRotation prunes old backups based on retention", async () => {
    const { result, pruned } = await mods.createBackupWithRotation({ retentionDays: 7 });
    expect(fs.existsSync(result.path)).toBe(true);
    expect(typeof pruned).toBe("number");
  });

  it("restore replaces the database and preserves rows from backup time", async () => {
    const backup = await mods.createBackup();
    // add a new row after the backup, then restore to before it
    mods.userRepository.create({ name: "Post", email: "post@x.com", passwordHash: "h" });
    mods.closeDb();

    const restored = await mods.restoreFromBackup(backup.path);
    expect(restored.path).toBe(backup.path);
    expect(restored.rowCount).toBeGreaterThanOrEqual(1);

    // post-restore, the user added after the backup should not exist
    const { userRepository } = await import("../src/repositories");
    expect(userRepository.findByEmail("post@x.com")).toBeUndefined();
    expect(userRepository.findByEmail("bak@x.com")).toBeDefined();
  });

  it("throws when restoring from a nonexistent backup", async () => {
    await expect(mods.restoreFromBackup(path.join(backupDir, "missing.db"))).rejects.toThrow(
      "not found"
    );
  });
});
