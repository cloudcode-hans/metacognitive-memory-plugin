/**
 * sql.js (WASM SQLite) store with debounced auto-save.
 * All tables scoped by session_id for multi-agent isolation.
 */
import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";
const SCHEMA = `
-- L0: Raw Log
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

-- L1: Extracted Memory
CREATE TABLE IF NOT EXISTS memory_l1_extracted (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL,
  memory_text     TEXT NOT NULL,
  memory_type     TEXT NOT NULL,
  importance      REAL DEFAULT 0.5,
  embedding_id    TEXT,
  source_ids      TEXT,
  dedup_hash      TEXT,
  verified INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_l1_session    ON memory_l1_extracted(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_l1_dedup     ON memory_l1_extracted(dedup_hash);

-- L2: Scene Block
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

-- L3: Cognitive Graph — Entities
CREATE TABLE IF NOT EXISTS kg_entity (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  name            TEXT NOT NULL,
  attrs           TEXT,
  importance      REAL DEFAULT 0.5,
  embedding_id    TEXT,
  frequency INTEGER DEFAULT 1,
  last_seen       TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_kg_entity_session ON kg_entity(session_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_kg_entity_name ON kg_entity(name);

-- L3: Cognitive Graph — Relations
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

-- L4: Goal Tracking
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

-- L5: Knowledge Base
CREATE TABLE IF NOT EXISTS knowledge_fact (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL,
  domain          TEXT NOT NULL,
  fact_text       TEXT NOT NULL,
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

-- L6: Self Model
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

-- L6: Error Log
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

-- Meta
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
`;
let _SQL = null;
async function getSql() {
    if (!_SQL) {
        // In Node.js, use the local wasm file from node_modules
        const sqlJsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "node_modules", "sql.js", "dist");
        _SQL = await initSqlJs({
            locateFile: (file) => join(sqlJsDir, file),
        });
    }
    return _SQL;
}
function nowIso() {
    return new Date().toISOString();
}
function uuid() {
    return randomUUID();
}
// ─── Store class ──────────────────────────────────────────────────────────────
export class MemoryStore {
    db = null;
    dbPath;
    saveTimer = null;
    savePending = false;
    initPromise = null;
    constructor(dbPath) {
        this.dbPath = dbPath;
    }
    async initialize() {
        if (this.initPromise)
            return this.initPromise;
        this.initPromise = this._init();
        return this.initPromise;
    }
    async _init() {
        const SQL = await getSql();
        // Ensure parent directory exists
        const dir = dirname(this.dbPath);
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        if (existsSync(this.dbPath)) {
            const fileBuffer = readFileSync(this.dbPath);
            this.db = new SQL.Database(fileBuffer);
        }
        else {
            this.db = new SQL.Database();
        }
        this.db.run(SCHEMA);
        // Ensure meta rows
        this.db.run(`INSERT OR IGNORE INTO meta (key, value, updated_at) VALUES ('version', '1.0.0', datetime('now'))`);
        this.db.run(`INSERT OR IGNORE INTO meta (key, value, updated_at) VALUES ('created_at', ?, datetime('now'))`, [nowIso()]);
    }
    scheduleSave() {
        if (this.savePending)
            return;
        this.savePending = true;
        this.saveTimer = setTimeout(() => {
            this.savePending = false;
            this.saveTimer = null;
            this._persistSync();
        }, 500);
    }
    _persistSync() {
        if (!this.db)
            return;
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            writeFileSync(this.dbPath, buffer);
        }
        catch {
            // Best-effort — may retry on next change
        }
    }
    async close() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
        this._persistSync();
        this.db?.close();
        this.db = null;
    }
    // ─── Helper: dict row ──────────────────────────────────────────────────────
    dictRow(sql, params = []) {
        if (!this.db)
            throw new Error("Store not initialized");
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        if (!stmt.step())
            return null;
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        stmt.free();
        const row = {};
        for (let i = 0; i < cols.length; i++)
            row[cols[i]] = vals[i];
        return row;
    }
    listRows(sql, params = []) {
        if (!this.db)
            throw new Error("Store not initialized");
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        const cols = stmt.getColumnNames();
        while (stmt.step()) {
            const vals = stmt.get();
            const row = {};
            for (let i = 0; i < cols.length; i++)
                row[cols[i]] = vals[i];
            rows.push(row);
        }
        stmt.free();
        return rows;
    }
    execute(sql, params = []) {
        if (!this.db)
            throw new Error("Store not initialized");
        this.db.run(sql, params);
        this.scheduleSave();
    }
    // ─── L0 ────────────────────────────────────────────────────────────────────
    l0Capture(p) {
        const id = uuid();
        this.execute(`INSERT INTO memory_l0_raw (id, session_id, role, content, tool_name, tool_result, timestamp, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, p.sessionId, p.role, p.content, p.toolName ?? null, p.toolResult ?? null, nowIso(), nowIso()]);
        return id;
    }
    l0List(sessionId, limit = 50) {
        return this.listRows(`SELECT * FROM memory_l0_raw WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?`, [sessionId, limit]);
    }
    // ─── L1 ────────────────────────────────────────────────────────────────────
    classifyContent(content) {
        const c = content.toLowerCase();
        if (/喜欢|讨厌|偏好|always|never|prefer|want|hate/.test(c))
            return "preference";
        if (/决定|选择|不选|决定用|chosen|will go with|picked/.test(c))
            return "decision";
        if (/我叫|名字是|我是|fact:|truth:/.test(c))
            return "fact";
        if (/记住|记下|别忘|must|should|need to/.test(c))
            return "instruction";
        return "context";
    }
    dedupHash(content) {
        // SHA-256 first 8 bytes, hex — matches Python implementation
        const digest = createHash("sha256").update(content.toLowerCase().trim()).digest();
        return digest.slice(0, 8).toString("hex");
    }
    l1Extract(sessionId, maxMemories = 30) {
        // Read L0 rows not yet in any L1 source_ids
        const l0Rows = this.listRows(`SELECT id, content FROM memory_l0_raw
       WHERE session_id = ?
       AND id NOT IN (
         SELECT DISTINCT value
         FROM memory_l1_extracted, json_each(source_ids)
         WHERE session_id = ?
       )
       ORDER BY timestamp
       LIMIT ?`, [sessionId, sessionId, maxMemories]);
        let count = 0;
        for (const row of l0Rows) {
            const l0Id = row.id;
            const content = row.content;
            const dedup = this.dedupHash(content);
            // Check dedup
            const existing = this.dictRow(`SELECT 1 FROM memory_l1_extracted WHERE session_id = ? AND dedup_hash = ? LIMIT 1`, [sessionId, dedup]);
            if (existing)
                continue;
            const memType = this.classifyContent(content);
            const memId = uuid();
            const importance = 0.5;
            const sourceIdsJson = JSON.stringify([l0Id]);
            this.execute(`INSERT INTO memory_l1_extracted
         (id, session_id, memory_text, memory_type, importance, dedup_hash, source_ids, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [memId, sessionId, content, memType, importance, dedup, sourceIdsJson, nowIso(), nowIso()]);
            count++;
        }
        return count;
    }
    l1List(sessionId, memoryType, limit = 50) {
        const sql = memoryType
            ? `SELECT * FROM memory_l1_extracted WHERE session_id = ? AND memory_type = ? ORDER BY created_at DESC LIMIT ?`
            : `SELECT * FROM memory_l1_extracted WHERE session_id = ? ORDER BY created_at DESC LIMIT ?`;
        const params = memoryType ? [sessionId, memoryType, limit] : [sessionId, limit];
        return this.listRows(sql, params);
    }
    // ─── L2 ────────────────────────────────────────────────────────────────────
    l2CreateScene(p) {
        const id = uuid();
        this.execute(`INSERT INTO memory_l2_scenes (id, session_id, scene_type, title, background, decision, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, p.sessionId, p.sceneType, p.title, p.background ?? null, p.decision ?? null, p.result ?? null, nowIso()]);
        return id;
    }
    l2ListScenes(sessionId, sceneType, limit = 50) {
        const sql = sceneType
            ? `SELECT * FROM memory_l2_scenes WHERE session_id = ? AND scene_type = ? ORDER BY created_at DESC LIMIT ?`
            : `SELECT * FROM memory_l2_scenes WHERE session_id = ? ORDER BY created_at DESC LIMIT ?`;
        const params = sceneType ? [sessionId, sceneType, limit] : [sessionId, limit];
        return this.listRows(sql, params);
    }
    // ─── L3 ────────────────────────────────────────────────────────────────────
    l3UpdateGraph(sessionId) {
        // Simple entity extraction from unprocessed L1 memories
        const rows = this.listRows(`SELECT id, memory_text FROM memory_l1_extracted
       WHERE session_id = ?
       AND id NOT IN (SELECT name FROM kg_entity WHERE session_id = ?)
       ORDER BY created_at DESC LIMIT 20`, [sessionId, sessionId]);
        const KNOWN_ENTITIES = {
            supplier: ["供应商", "厂家", "vendor", "supplier"],
            person: ["人", "老板", "工程师", "经理", "human"],
            project: ["项目", "工单", "订单", "project", "order"],
            decision: ["决定", "选择", "方案"],
            concept: ["概念", "方法", "思路"],
        };
        let entitiesCreated = 0;
        for (const row of rows) {
            const text = row.memory_text;
            for (const [entType, kws] of Object.entries(KNOWN_ENTITIES)) {
                for (const kw of kws) {
                    if (text.toLowerCase().includes(kw.toLowerCase())) {
                        const name = text.substring(0, 30).trim();
                        if (name.length < 2)
                            continue;
                        try {
                            this.execute(`INSERT INTO kg_entity (id, session_id, entity_type, name, last_seen, frequency, created_at)
                 VALUES (?, ?, ?, ?, ?, 1, ?)`, [uuid(), sessionId, entType, name, nowIso(), nowIso()]);
                            entitiesCreated++;
                        }
                        catch {
                            // Ignore duplicate
                        }
                        break;
                    }
                }
            }
        }
        return { entitiesCreated };
    }
    l3ListEntities(sessionId, entityType, limit = 50) {
        const sql = entityType
            ? `SELECT * FROM kg_entity WHERE session_id = ? AND entity_type = ? ORDER BY frequency DESC LIMIT ?`
            : `SELECT * FROM kg_entity WHERE session_id = ? ORDER BY frequency DESC LIMIT ?`;
        const params = entityType ? [sessionId, entityType, limit] : [sessionId, limit];
        return this.listRows(sql, params);
    }
    l3ListRelations(sessionId, fromEntityId, limit = 50) {
        const sql = fromEntityId
            ? `SELECT * FROM kg_relation WHERE session_id = ? AND from_entity_id = ? LIMIT ?`
            : `SELECT * FROM kg_relation WHERE session_id = ? LIMIT ?`;
        return this.listRows(sql, fromEntityId ? [sessionId, fromEntityId, limit] : [sessionId, limit]);
    }
    // ─── L4 ────────────────────────────────────────────────────────────────────
    l4CreateGoal(p) {
        const id = uuid();
        this.execute(`INSERT INTO goal (id, session_id, parent_id, title, description, status, priority, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`, [
            id,
            p.sessionId,
            p.parentId ?? null,
            p.title,
            p.description ?? null,
            p.priority ?? 2,
            nowIso(),
            nowIso(),
        ]);
        return id;
    }
    l4Tree(sessionId) {
        // Recursive CTE for goal tree
        return this.listRows(`WITH RECURSIVE goal_tree AS (
        SELECT id, parent_id, title, status, priority, blocker, due_date, 0 AS depth
        FROM goal WHERE session_id = ? AND parent_id IS NULL
        UNION ALL
        SELECT g.id, g.parent_id, g.title, g.status, g.priority, g.blocker, g.due_date, gt.depth+1
        FROM goal g JOIN goal_tree gt ON g.parent_id = gt.id
        WHERE g.session_id = ?
      )
      SELECT id, parent_id, title, status, priority, depth FROM goal_tree ORDER BY depth, priority`, [sessionId, sessionId]);
    }
    l4UpdateGoal(p) {
        const updates = ["updated_at = ?"];
        const params = [nowIso()];
        if (p.status) {
            updates.push(`status = ?`);
            params.push(p.status);
        }
        if (p.blocker !== undefined) {
            updates.push(`blocker = ?`);
            params.push(p.blocker);
        }
        if (p.priority !== undefined) {
            updates.push(`priority = ?`);
            params.push(p.priority);
        }
        params.push(p.goalId);
        this.execute(`UPDATE goal SET ${updates.join(", ")} WHERE id = ?`, params);
    }
    l4DeleteGoal(goalId) {
        this.execute(`DELETE FROM goal WHERE id = ?`, [goalId]);
    }
    // ─── L5 ────────────────────────────────────────────────────────────────────
    l5AddFact(p) {
        const id = uuid();
        this.execute(`INSERT INTO knowledge_fact (id, session_id, domain, fact_text, confidence, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            id,
            p.sessionId,
            p.domain,
            p.factText,
            p.confidence ?? 0.8,
            p.tags ? JSON.stringify(p.tags) : null,
            nowIso(),
        ]);
        return id;
    }
    l5Search(sessionId, query, limit = 20) {
        // Fallback LIKE search when FTS5 is not available (sql.js limitation)
        const q = `%${query}%`;
        return this.listRows(`SELECT id, domain, fact_text, confidence, verified, created_at
       FROM knowledge_fact
       WHERE session_id = ? AND (fact_text LIKE ? OR domain LIKE ?)
       LIMIT ?`, [sessionId, q, q, limit]);
    }
    l5VerifyFact(factId) {
        this.execute(`UPDATE knowledge_fact SET verified = 1, verified_at = ? WHERE id = ?`, [nowIso(), factId]);
    }
    l5ListFacts(sessionId, domain, limit = 50) {
        const sql = domain
            ? `SELECT id, domain, fact_text, confidence, verified, verified_at, created_at FROM knowledge_fact WHERE session_id = ? AND domain = ? ORDER BY created_at DESC LIMIT ?`
            : `SELECT id, domain, fact_text, confidence, verified, verified_at, created_at FROM knowledge_fact WHERE session_id = ? ORDER BY created_at DESC LIMIT ?`;
        return this.listRows(sql, domain ? [sessionId, domain, limit] : [sessionId, limit]);
    }
    l5DeleteFact(factId) {
        this.execute(`DELETE FROM knowledge_fact WHERE id = ?`, [factId]);
    }
    // ─── L6 ────────────────────────────────────────────────────────────────────
    l6LogError(p) {
        const id = uuid();
        this.execute(`INSERT INTO error_log (id, session_id, error_type, summary, detail, stack_trace, context, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            p.sessionId,
            p.errorType,
            p.summary,
            p.detail ?? null,
            p.stackTrace ?? null,
            p.context ? JSON.stringify(p.context) : null,
            nowIso(),
        ]);
        return id;
    }
    l6SelfCheck(sessionId) {
        const errorRows = this.listRows(`SELECT error_type, COUNT(*) as cnt FROM error_log WHERE session_id = ? AND resolved = 0 GROUP BY error_type`, [sessionId]);
        const errorStats = {};
        for (const r of errorRows)
            errorStats[r.error_type] = r.cnt;
        const capRows = this.listRows(`SELECT category, COUNT(*) as cnt FROM self_model WHERE session_id = ? GROUP BY category`, [sessionId]);
        const capCategories = {};
        for (const r of capRows)
            capCategories[r.category] = r.cnt;
        const recentErrors = this.listRows(`SELECT id, error_type, summary, created_at FROM error_log WHERE session_id = ? ORDER BY created_at DESC LIMIT 5`, [sessionId]);
        return { errorStats, capCategories, recentErrors };
    }
}
//# sourceMappingURL=store.js.map