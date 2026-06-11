/**
 * Migration utilities for upgrading from sql.js to native SQLite.
 */

import initSqlJs, { type SqlJsStatic, type Database as SqlJsDatabase } from "sql.js";
import sqlite3 from "better-sqlite3";
import type { Database as SqliteDatabase } from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let _SQL: SqlJsStatic | null = null;

async function getSqlJs(): Promise<SqlJsStatic> {
  if (!_SQL) {
    const sqlJsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "node_modules", "sql.js", "dist");
    _SQL = await initSqlJs({
      locateFile: (file: string) => join(sqlJsDir, file),
    });
  }
  return _SQL;
}

export async function migrateFromSqlJs(oldDbPath: string, newDbPath: string): Promise<{ migrated: boolean; tables: string[]; rowCounts: Record<string, number> }> {
  if (!existsSync(oldDbPath)) {
    return { migrated: false, tables: [], rowCounts: {} };
  }

  const SQL = await getSqlJs();
  const oldDbBuffer = readFileSync(oldDbPath);
  const oldDb = new SQL.Database(oldDbBuffer);

  const newDb = new sqlite3(newDbPath);
  newDb.pragma("journal_mode = WAL");
  newDb.pragma("foreign_keys = ON");

  try {
    sqliteVec.load(newDb);
  } catch {
  }

  const SCHEMA = `
    CREATE TABLE IF NOT EXISTS memory_l0_raw (
      id           TEXT PRIMARY KEY,
      session_id   TEXT NOT NULL,
      role TEXT NOT NULL,
      content      TEXT NOT NULL,
      tool_name    TEXT,
      tool_result  TEXT,
      timestamp    TEXT NOT NULL,
      created_at   TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_l0_session ON memory_l0_raw(session_id, timestamp);

    CREATE TABLE IF NOT EXISTS memory_l1_extracted (
      id              TEXT PRIMARY KEY,
      session_id      TEXT NOT NULL,
      memory_text     TEXT NOT NULL,
      memory_type     TEXT NOT NULL,
      importance      REAL DEFAULT 0.5,
      embedding       BLOB,
      embedding_id    TEXT,
      source_ids      TEXT,
      dedup_hash      TEXT,
      verified INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_l1_session    ON memory_l1_extracted(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_l1_dedup     ON memory_l1_extracted(dedup_hash);

    CREATE TABLE IF NOT EXISTS memory_l2_scenes (
      id TEXT PRIMARY KEY,
      session_id      TEXT NOT NULL,
      scene_type      TEXT NOT NULL,
      title           TEXT NOT NULL,
      background      TEXT,
      decision TEXT,
      result TEXT,
      actors TEXT,
      key_memories    TEXT,
      importance      REAL DEFAULT 0.5,
      created_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_l2_session ON memory_l2_scenes(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_l2_type    ON memory_l2_scenes(scene_type);

    CREATE TABLE IF NOT EXISTS kg_entity (
      id              TEXT PRIMARY KEY,
      session_id      TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      name            TEXT NOT NULL,
      attrs           TEXT,
      importance      REAL DEFAULT 0.5,
      embedding       BLOB,
      embedding_id    TEXT,
      frequency INTEGER DEFAULT 1,
      last_seen       TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_kg_entity_session ON kg_entity(session_id, entity_type);
    CREATE INDEX IF NOT EXISTS idx_kg_entity_name ON kg_entity(name);

    CREATE TABLE IF NOT EXISTS kg_relation (
      id              TEXT PRIMARY KEY,
      session_id      TEXT NOT NULL,
      from_entity_id  TEXT NOT NULL,
      to_entity_id    TEXT NOT NULL,
      rel_type        TEXT NOT NULL,
      weight          REAL DEFAULT 1.0,
      context         TEXT,
      bidirectional INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_kg_rel_session  ON kg_relation(session_id);
    CREATE INDEX IF NOT EXISTS idx_kg_rel_from    ON kg_relation(from_entity_id);
    CREATE INDEX IF NOT EXISTS idx_kg_rel_to      ON kg_relation(to_entity_id);

    CREATE TABLE IF NOT EXISTS goal (
      id              TEXT PRIMARY KEY,
      session_id      TEXT NOT NULL,
      parent_id       TEXT,
      title           TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      blocker         TEXT,
      priority INTEGER DEFAULT 2,
      due_date TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_goal_session ON goal(session_id, status);
    CREATE INDEX IF NOT EXISTS idx_goal_parent  ON goal(parent_id);

    CREATE TABLE IF NOT EXISTS knowledge_fact (
      id              TEXT PRIMARY KEY,
      session_id      TEXT NOT NULL,
      domain          TEXT NOT NULL,
      fact_text       TEXT NOT NULL,
      embedding       BLOB,
      source_scene_id TEXT,
      source_memory_id TEXT,
      confidence      REAL DEFAULT 0.8,
      verified        INTEGER DEFAULT 0,
      verifier TEXT,
      verified_at     TEXT,
      tags TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_kf_session ON knowledge_fact(session_id, domain);
    CREATE INDEX IF NOT EXISTS idx_kf_domain  ON knowledge_fact(domain);

    CREATE TABLE IF NOT EXISTS self_model (
      id              TEXT PRIMARY KEY,
      session_id      TEXT NOT NULL,
      category        TEXT NOT NULL,
      content TEXT NOT NULL,
      confidence      REAL DEFAULT 0.5,
      evidence_count  INTEGER DEFAULT 0,
      verified        INTEGER DEFAULT 0,
      last_verified_at TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sm_session   ON self_model(session_id, category);
    CREATE INDEX IF NOT EXISTS idx_sm_category ON self_model(category);

    CREATE TABLE IF NOT EXISTS error_log (
      id              TEXT PRIMARY KEY,
      session_id      TEXT NOT NULL,
      error_type      TEXT NOT NULL,
      summary         TEXT NOT NULL,
      detail          TEXT,
      stack_trace     TEXT,
      context TEXT,
      resolved INTEGER DEFAULT 0,
      resolved_at     TEXT,
      resolution      TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_el_session   ON error_log(session_id, error_type);
    CREATE INDEX IF NOT EXISTS idx_el_resolved ON error_log(resolved);

    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `;

  newDb.exec(SCHEMA);

  const tables = [
    "memory_l0_raw",
    "memory_l1_extracted",
    "memory_l2_scenes",
    "kg_entity",
    "kg_relation",
    "goal",
    "knowledge_fact",
    "self_model",
    "error_log",
    "meta"
  ];

  const rowCounts: Record<string, number> = {};

  for (const table of tables) {
    try {
      const oldRows = oldDb.exec(`SELECT * FROM ${table}`);
      if (!oldRows.length) continue;

      const columns = oldRows[0].columns;
      const placeholders = columns.map(() => '?').join(',');
      const insertStmt = newDb.prepare(`INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);

      let count = 0;
      for (const row of oldRows[0].values) {
        insertStmt.run(row);
        count++;
      }

      rowCounts[table] = count;
    } catch {
      rowCounts[table] = 0;
    }
  }

  newDb.exec(`REPLACE INTO meta (key, value, updated_at) VALUES ('version', '2.0.0', datetime('now'))`);
  newDb.exec(`REPLACE INTO meta (key, value, updated_at) VALUES ('migrated_from', 'sql.js', datetime('now'))`);

  oldDb.close();
  newDb.close();

  return { migrated: true, tables, rowCounts };
}

export async function checkMigrationNeeded(dbPath: string): Promise<boolean> {
  if (!existsSync(dbPath)) {
    return false;
  }

  try {
    const db = new sqlite3(dbPath);
    const row = db.prepare(`SELECT value FROM meta WHERE key = 'version'`).get() as { value?: string };
    db.close();
    return row?.value !== "2.0.0";
  } catch {
    return true;
  }
}
