/**
 * Native SQLite store with sqlite-vec vector support.
 * All tables scoped by session_id for multi-agent isolation.
 */
import sqlite3 from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
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

-- L1: Session State (会话状态管理)
CREATE TABLE IF NOT EXISTS session_state (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL,
  state_key       TEXT NOT NULL,
  state_value     TEXT,
  state_type      TEXT DEFAULT 'json',
  ttl_seconds     INTEGER,
  checkpoint_pos  INTEGER DEFAULT 0,
  locked_until    TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ss_session    ON session_state(session_id);
CREATE INDEX IF NOT EXISTS idx_ss_key        ON session_state(session_id, state_key);
CREATE INDEX IF NOT EXISTS idx_ss_expiry     ON session_state(locked_until);

-- L1: Extracted Memory (语义记忆，向后兼容)
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
  embedding       BLOB,
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

-- L3: Semantic Memory FTS5 Index (全文检索)
CREATE VIRTUAL TABLE IF NOT EXISTS semantic_fts USING fts5(
  session_id UNINDEXED,
  memory_text,
  entity_name,
  fact_text
);

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

-- L4/L5/L6: File-based Storage Index (文件存储索引)
CREATE TABLE IF NOT EXISTS file_index (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL,
  layer           TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  title           TEXT,
  summary         TEXT,
  tags            TEXT,
  embedding       BLOB,
  last_modified   TEXT,
  version         TEXT DEFAULT '1.0',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fi_session   ON file_index(session_id);
CREATE INDEX IF NOT EXISTS idx_fi_layer     ON file_index(layer);
CREATE INDEX IF NOT EXISTS idx_fi_path      ON file_index(file_path);

-- Meta
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
`;
const VECTOR_SCHEMA = `
-- Vector tables for similarity search
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL,
  embedding       BLOB NOT NULL,
  dimension       INTEGER NOT NULL,
  source_type     TEXT NOT NULL,
  source_id       TEXT NOT NULL,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Vector index for fast similarity search
CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings_idx USING vec0(embedding float32(768));
`;
function nowIso() {
    return new Date().toISOString();
}
function uuid() {
    return randomUUID();
}
export class MemoryStore {
    db = null;
    dbPath;
    initPromise = null;
    vecEnabled = false;
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
        const dir = dirname(this.dbPath);
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        this.db = new sqlite3(this.dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        try {
            sqliteVec.load(this.db);
            this.vecEnabled = true;
        }
        catch {
            this.vecEnabled = false;
        }
        this.db.exec(SCHEMA);
        if (this.vecEnabled) {
            try {
                this.db.exec(VECTOR_SCHEMA);
            }
            catch {
            }
        }
        this.db.exec(`INSERT OR IGNORE INTO meta (key, value, updated_at) VALUES ('version', '2.0.0', datetime('now'))`);
        this.db.prepare(`INSERT OR IGNORE INTO meta (key, value, updated_at) VALUES ('created_at', ?, datetime('now'))`).run(nowIso());
        this.db.prepare(`INSERT OR IGNORE INTO meta (key, value, updated_at) VALUES ('vector_enabled', ?, datetime('now'))`).run(this.vecEnabled ? "true" : "false");
    }
    async close() {
        this.db?.close();
        this.db = null;
    }
    dictRow(sql, params = []) {
        if (!this.db)
            throw new Error("Store not initialized");
        const stmt = this.db.prepare(sql);
        const row = stmt.get(params);
        return row || null;
    }
    listRows(sql, params = []) {
        if (!this.db)
            throw new Error("Store not initialized");
        const stmt = this.db.prepare(sql);
        return stmt.all(params);
    }
    execute(sql, params = []) {
        if (!this.db)
            throw new Error("Store not initialized");
        const stmt = this.db.prepare(sql);
        const result = stmt.run(params);
        return result.changes;
    }
    // ─── Vector Operations ──────────────────────────────────────────────────────
    storeEmbedding(p) {
        if (!this.vecEnabled)
            return "";
        const id = uuid();
        const blob = Buffer.from(new Float32Array(p.embedding).buffer);
        this.execute(`INSERT INTO memory_embeddings (id, session_id, embedding, dimension, source_type, source_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, p.sessionId, blob, p.embedding.length, p.sourceType, p.sourceId, nowIso()]);
        try {
            this.execute(`INSERT INTO memory_embeddings_idx(rowid, embedding) VALUES ((SELECT rowid FROM memory_embeddings WHERE id = ?), ?)`, [id, blob]);
        }
        catch {
        }
        return id;
    }
    vectorSearch(p) {
        if (!this.vecEnabled || !this.db)
            return [];
        const { sessionId, queryEmbedding, sourceType, limit = 10 } = p;
        const queryBlob = Buffer.from(new Float32Array(queryEmbedding).buffer);
        let sql = `
      SELECT e.source_id, e.source_type, distance
      FROM memory_embeddings e, vec0_distance(e.embedding, ?) AS distance
      WHERE e.session_id = ?
    `;
        const params = [queryBlob, sessionId];
        if (sourceType) {
            sql += ` AND e.source_type = ?`;
            params.push(sourceType);
        }
        sql += ` ORDER BY distance LIMIT ?`;
        params.push(limit);
        try {
            return this.listRows(sql, params)
                .map(row => ({
                sourceId: row.source_id,
                sourceType: row.source_type,
                distance: row.distance
            }));
        }
        catch {
            return [];
        }
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
    l0ListAll(limit = 50) {
        return this.listRows(`SELECT * FROM memory_l0_raw ORDER BY timestamp DESC LIMIT ?`, [limit]);
    }
    l1ListAll(limit = 50) {
        return this.listRows(`SELECT * FROM memory_l1_extracted ORDER BY created_at DESC LIMIT ?`, [limit]);
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
        const digest = createHash("sha256").update(content.toLowerCase().trim()).digest();
        return digest.slice(0, 8).toString("hex");
    }
    l1Extract(sessionId, maxMemories = 30) {
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
    l1AddEmbedding(p) {
        if (!this.vecEnabled)
            return;
        const blob = Buffer.from(new Float32Array(p.embedding).buffer);
        this.execute(`UPDATE memory_l1_extracted SET embedding = ?, updated_at = ? WHERE id = ? AND session_id = ?`, [blob, nowIso(), p.memoryId, p.sessionId]);
        this.storeEmbedding({
            sessionId: p.sessionId,
            embedding: p.embedding,
            sourceType: "l1",
            sourceId: p.memoryId
        });
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
    // Chinese stopwords that should never be extracted as entity names
    static ZH_STOPWORDS = new Set([
        '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你',
        '会', '着', '没有', '看', '好', '自己', '这', '那', '它', '他', '她', '们', '这个', '那个', '什么', '怎么', '为什么',
        '可以', '能', '可能', '如果', '因为', '所以', '但是', '而且', '或者', '还是', '只是', '只有', '才', '还', '已经',
        '使用', '进行', '通过', '根据', '按照', '为了', '关于', '对于', '作为', '以及', '其中', '以后', '以内', '以外',
        '这样', '那样', '如何', '怎样', '多少', '哪儿', '哪里', '哪个', '哪些', '谁', '哪', '咋', '咋样',
        '没', '把', '被', '让', '给', '跟', '同', '或', '并', '且', '又', '再', '从', '向', '往', '朝',
        '一下', '一点', '一些', '一定', '一样', '一起', '一直', '一面', '一方面', '另一方面',
        '有些', '有的', '某', '某些', '各', '每', '此', '彼', '其', '之',
        '做', '当', '而', '却', '然后', '接着', '于是', '因此', '否则', '无论', '尽管',
        '怎么', '哪样', '怎样', '如何', '是否', '要么', '还是', '或者',
    ]);
    // Characters that indicate meaningful content (nouns, verbs, adjectives)
    static MEANINGFUL_CHARS = /[\u4e00-\u9fff]|[a-zA-Z]{2,}/;
    extractEntityName(text, keyword) {
        const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
        const start = Math.max(0, idx - 10);
        const end = Math.min(text.length, idx + keyword.length + 20);
        let candidate = text.substring(start, end).trim();
        // Find sentence boundary
        const sentenceEnd = candidate.search(/[。！？\.\?!,，:：;；]/);
        if (sentenceEnd !== -1) {
            candidate = candidate.substring(0, sentenceEnd).trim();
        }
        // Find word boundary (space or Chinese comma)
        const wordEnd = candidate.search(/[\s，,]/);
        if (wordEnd !== -1 && wordEnd < 30) {
            candidate = candidate.substring(0, wordEnd).trim();
        }
        // Truncate to reasonable length
        candidate = candidate.substring(0, 30).trim();
        // ── Quality filters ─────────────────────────────────────────────────────
        // 1. Minimum length: English ≥3 chars, Chinese ≥2 chars
        const hasChinese = /[\u4e00-\u9fff]/.test(candidate);
        const hasEnglish = /[a-zA-Z]/.test(candidate);
        if (hasChinese && candidate.length < 2)
            return '';
        if (hasEnglish && !hasChinese && candidate.replace(/[^a-zA-Z]/g, '').length < 3)
            return '';
        // 2. Filter broken English fragments (e.g., "ry-plugin", "tion-")
        if (hasEnglish) {
            const cleanEnglish = candidate.replace(/[^a-zA-Z]/g, ' ');
            const words = cleanEnglish.split(/\s+/).filter(w => w.length > 0);
            // If most English words are broken (<3 chars), reject
            if (words.length > 0) {
                const brokenRatio = words.filter(w => w.length < 3).length / words.length;
                if (brokenRatio > 0.5)
                    return '';
            }
        }
        // 3. Chinese stopwords filter - reject if entire name is stopwords
        if (hasChinese) {
            const chars = [...candidate];
            const nonStopwordChars = chars.filter(c => !MemoryStore.ZH_STOPWORDS.has(c));
            // If more than 70% are stopwords, reject
            if (nonStopwordChars.length < chars.length * 0.3)
                return '';
            // Also check if name is purely stopwords
            if (chars.every(c => MemoryStore.ZH_STOPWORDS.has(c) || /[，。！？、：；,\.!?\s]/.test(c)))
                return '';
        }
        // 4. Must contain at least some meaningful characters
        if (!MemoryStore.MEANINGFUL_CHARS.test(candidate))
            return '';
        return candidate;
    }
    l3UpdateGraph(sessionId) {
        const rows = this.listRows(`SELECT id, memory_text FROM memory_l1_extracted
       WHERE session_id = ?
       ORDER BY created_at DESC LIMIT 20`, [sessionId]);
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
                        const name = this.extractEntityName(text, kw);
                        if (name.length < 2)
                            continue;
                        const existing = this.listRows(`SELECT id, frequency FROM kg_entity WHERE session_id = ? AND name = ?`, [sessionId, name]);
                        if (existing.length > 0) {
                            this.execute(`UPDATE kg_entity SET frequency = frequency + 1, last_seen = ? WHERE id = ?`, [nowIso(), existing[0].id]);
                        }
                        else {
                            this.execute(`INSERT INTO kg_entity (id, session_id, entity_type, name, last_seen, frequency, created_at)
                 VALUES (?, ?, ?, ?, ?, 1, ?)`, [uuid(), sessionId, entType, name, nowIso(), nowIso()]);
                            entitiesCreated++;
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
    l3AddEntityEmbedding(p) {
        if (!this.vecEnabled)
            return;
        const blob = Buffer.from(new Float32Array(p.embedding).buffer);
        this.execute(`UPDATE kg_entity SET embedding = ?, updated_at = ? WHERE id = ? AND session_id = ?`, [blob, nowIso(), p.entityId, p.sessionId]);
        this.storeEmbedding({
            sessionId: p.sessionId,
            embedding: p.embedding,
            sourceType: "l3",
            sourceId: p.entityId
        });
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
        params.push(p.goalId, p.sessionId);
        this.execute(`UPDATE goal SET ${updates.join(", ")} WHERE id = ? AND session_id = ?`, params);
    }
    l4DeleteGoal(goalId, sessionId) {
        this.execute(`DELETE FROM goal WHERE id = ? AND session_id = ?`, [goalId, sessionId]);
    }
    // ─── L5 ────────────────────────────────────────────────────────────────────
    l5AddFact(p) {
        const id = uuid();
        let blob = null;
        if (this.vecEnabled && p.embedding) {
            blob = Buffer.from(new Float32Array(p.embedding).buffer);
        }
        this.execute(`INSERT INTO knowledge_fact (id, session_id, domain, fact_text, embedding, confidence, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            p.sessionId,
            p.domain,
            p.factText,
            blob ?? null,
            p.confidence ?? 0.8,
            p.tags ? JSON.stringify(p.tags) : null,
            nowIso(),
        ]);
        if (this.vecEnabled && p.embedding) {
            this.storeEmbedding({
                sessionId: p.sessionId,
                embedding: p.embedding,
                sourceType: "l5",
                sourceId: id
            });
        }
        return id;
    }
    l5Search(sessionId, query, limit = 20) {
        const q = `%${query}%`;
        return this.listRows(`SELECT id, domain, fact_text, confidence, verified, created_at
       FROM knowledge_fact
       WHERE session_id = ? AND (fact_text LIKE ? OR domain LIKE ?)
       ORDER BY confidence DESC LIMIT ?`, [sessionId, q, q, limit]);
    }
    l5VectorSearch(p) {
        if (!this.vecEnabled)
            return [];
        const results = this.vectorSearch({
            sessionId: p.sessionId,
            queryEmbedding: p.queryEmbedding,
            sourceType: "l5",
            limit: p.limit
        });
        const factIds = results.map(r => r.sourceId);
        if (factIds.length === 0)
            return [];
        const placeholders = factIds.map(() => '?').join(',');
        const facts = this.listRows(`SELECT id, fact_text, confidence FROM knowledge_fact WHERE id IN (${placeholders})`, factIds);
        const factMap = new Map(facts.map(f => [f.id, f]));
        return results.map(r => {
            const fact = factMap.get(r.sourceId);
            return {
                factId: r.sourceId,
                factText: fact?.fact_text || "",
                distance: r.distance,
                confidence: fact?.confidence || 0
            };
        }).filter(r => r.factText);
    }
    l5VerifyFact(factId, sessionId) {
        this.execute(`UPDATE knowledge_fact SET verified = 1, verified_at = ? WHERE id = ? AND session_id = ?`, [nowIso(), factId, sessionId]);
    }
    l5ListFacts(sessionId, domain, limit = 50) {
        const sql = domain
            ? `SELECT id, domain, fact_text, confidence, verified, verified_at, created_at FROM knowledge_fact WHERE session_id = ? AND domain = ? ORDER BY created_at DESC LIMIT ?`
            : `SELECT id, domain, fact_text, confidence, verified, verified_at, created_at FROM knowledge_fact WHERE session_id = ? ORDER BY created_at DESC LIMIT ?`;
        return this.listRows(sql, domain ? [sessionId, domain, limit] : [sessionId, limit]);
    }
    l5DeleteFact(factId, sessionId) {
        this.execute(`DELETE FROM knowledge_fact WHERE id = ? AND session_id = ?`, [factId, sessionId]);
        if (this.vecEnabled) {
            this.execute(`DELETE FROM memory_embeddings WHERE source_id = ? AND source_type = 'l5'`, [factId]);
        }
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
        let totalErrors = 0;
        for (const r of errorRows) {
            errorStats[r.error_type] = r.cnt;
            totalErrors += r.cnt;
        }
        const capRows = this.listRows(`SELECT category, COUNT(*) as cnt FROM self_model WHERE session_id = ? GROUP BY category`, [sessionId]);
        const capCategories = {};
        let totalSelfModelEntries = 0;
        for (const r of capRows) {
            capCategories[r.category] = r.cnt;
            totalSelfModelEntries += r.cnt;
        }
        const verifiedCount = this.listRows(`SELECT COUNT(*) as cnt FROM self_model WHERE session_id = ? AND verified = 1`, [sessionId])[0]?.cnt ?? 0;
        const recentErrors = this.listRows(`SELECT id, error_type, summary, created_at FROM error_log WHERE session_id = ? ORDER BY created_at DESC LIMIT 5`, [sessionId]);
        const score = Math.max(0, Math.min(100, 100
            - (totalErrors * 5)
            + (totalSelfModelEntries * 2)
            + (verifiedCount * 1)));
        return { score, errorStats, capCategories, recentErrors, totalErrors, totalSelfModelEntries, verifiedCount };
    }
    // ─── Data Lifecycle ────────────────────────────────────────────────────────
    purgeOldByAge(days, sessionId) {
        const cutoffDate = `datetime('now', '-${days} days')`;
        let totalDeleted = 0;
        const tables = [
            { name: 'memory_l0_raw', dateField: 'created_at' },
            { name: 'memory_l1_extracted', dateField: 'created_at' },
            { name: 'memory_l2_scenes', dateField: 'created_at' },
            { name: 'goal', dateField: 'updated_at' },
            { name: 'knowledge_fact', dateField: 'created_at' },
            { name: 'error_log', dateField: 'created_at' },
            { name: 'self_model', dateField: 'updated_at' }
        ];
        for (const table of tables) {
            let query;
            let params = [];
            if (sessionId) {
                query = `DELETE FROM ${table.name} WHERE session_id = ? AND ${table.dateField} < ${cutoffDate}`;
                params = [sessionId];
            }
            else {
                query = `DELETE FROM ${table.name} WHERE ${table.dateField} < ${cutoffDate}`;
            }
            totalDeleted += this.execute(query, params);
        }
        return { totalDeleted, days, sessionId: sessionId || null };
    }
    purgeByFrequency(minFrequency, maxDays, sessionId) {
        let totalDeleted = 0;
        const baseQuery = sessionId
            ? `SELECT id FROM kg_entity WHERE session_id = ? AND frequency < ? AND last_seen < datetime('now', '-${maxDays} days')`
            : `SELECT id FROM kg_entity WHERE frequency < ? AND last_seen < datetime('now', '-${maxDays} days')`;
        const params = sessionId ? [sessionId, minFrequency] : [minFrequency];
        const entitiesToDelete = this.listRows(baseQuery, params);
        for (const entity of entitiesToDelete) {
            totalDeleted += this.execute(`DELETE FROM kg_relation WHERE from_entity_id = ? OR to_entity_id = ?`, [entity.id, entity.id]);
            totalDeleted += this.execute(`DELETE FROM kg_entity WHERE id = ?`, [entity.id]);
            if (this.vecEnabled) {
                this.execute(`DELETE FROM memory_embeddings WHERE source_id = ? AND source_type = 'l3'`, [entity.id]);
            }
        }
        return { totalDeleted, minFrequency, maxDays, sessionId: sessionId || null };
    }
    smartPurge(config = {}) {
        const { defaultRetentionDays = 90, highFreqRetentionDays = 180, mediumFreqRetentionDays = 90, lowFreqRetentionDays = 30, highFreqThreshold = 10, mediumFreqThreshold = 3, sessionId } = config;
        let totalDeleted = 0;
        const l1Rows = this.listRows(sessionId
            ? `SELECT id, importance FROM memory_l1_extracted WHERE session_id = ? AND created_at < datetime('now', '-${defaultRetentionDays} days')`
            : `SELECT id, importance FROM memory_l1_extracted WHERE created_at < datetime('now', '-${defaultRetentionDays} days')`, sessionId ? [sessionId] : []);
        for (const row of l1Rows) {
            const retentionDays = row.importance >= 0.8 ? highFreqRetentionDays :
                row.importance >= 0.5 ? mediumFreqRetentionDays : lowFreqRetentionDays;
            const ageCheck = this.listRows(`SELECT 1 FROM memory_l1_extracted WHERE id = ? AND created_at < datetime('now', '-${retentionDays} days')`, [row.id]);
            if (ageCheck.length > 0) {
                totalDeleted += this.execute(`DELETE FROM memory_l1_extracted WHERE id = ?`, [row.id]);
                if (this.vecEnabled) {
                    this.execute(`DELETE FROM memory_embeddings WHERE source_id = ? AND source_type = 'l1'`, [row.id]);
                }
            }
        }
        const entityRows = this.listRows(sessionId
            ? `SELECT id, frequency FROM kg_entity WHERE session_id = ?`
            : `SELECT id, frequency FROM kg_entity`, sessionId ? [sessionId] : []);
        for (const row of entityRows) {
            let retentionDays;
            if (row.frequency >= highFreqThreshold)
                retentionDays = highFreqRetentionDays;
            else if (row.frequency >= mediumFreqThreshold)
                retentionDays = mediumFreqRetentionDays;
            else
                retentionDays = lowFreqRetentionDays;
            const ageCheck = this.listRows(`SELECT 1 FROM kg_entity WHERE id = ? AND last_seen < datetime('now', '-${retentionDays} days')`, [row.id]);
            if (ageCheck.length > 0) {
                totalDeleted += this.execute(`DELETE FROM kg_relation WHERE from_entity_id = ? OR to_entity_id = ?`, [row.id, row.id]);
                totalDeleted += this.execute(`DELETE FROM kg_entity WHERE id = ?`, [row.id]);
                if (this.vecEnabled) {
                    this.execute(`DELETE FROM memory_embeddings WHERE source_id = ? AND source_type = 'l3'`, [row.id]);
                }
            }
        }
        return {
            totalDeleted,
            config: { defaultRetentionDays, highFreqRetentionDays, mediumFreqRetentionDays, lowFreqRetentionDays, highFreqThreshold, mediumFreqThreshold }
        };
    }
    getStorageStats() {
        const tables = [
            'memory_l0_raw',
            'memory_l1_extracted',
            'memory_l2_scenes',
            'kg_entity',
            'kg_relation',
            'goal',
            'knowledge_fact',
            'error_log',
            'self_model',
            'memory_embeddings'
        ];
        const stats = {};
        let totalRows = 0;
        for (const table of tables) {
            try {
                const count = this.listRows(`SELECT COUNT(*) as cnt FROM ${table}`)[0]?.cnt ?? 0;
                stats[table] = count;
                totalRows += count;
            }
            catch {
                stats[table] = 0;
            }
        }
        return { stats, totalRows, vectorEnabled: this.vecEnabled };
    }
    // ─── Migration ────────────────────────────────────────────────────────────
    getVersion() {
        const row = this.dictRow(`SELECT value FROM meta WHERE key = 'version'`);
        return row?.value || "1.0.0";
    }
    setVersion(version) {
        this.execute(`REPLACE INTO meta (key, value, updated_at) VALUES ('version', ?, ?)`, [version, nowIso()]);
    }
    // ─── L1: Session State Management ────────────────────────────────────────────
    l1SetSessionState(p) {
        const id = uuid();
        const lockedUntil = p.ttlSeconds
            ? `datetime('now', '+${p.ttlSeconds} seconds')`
            : null;
        this.execute(`INSERT OR REPLACE INTO session_state 
       (id, session_id, state_key, state_value, state_type, ttl_seconds, checkpoint_pos, locked_until, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            p.sessionId,
            p.stateKey,
            JSON.stringify(p.stateValue),
            p.stateType || 'json',
            p.ttlSeconds || null,
            p.checkpointPos || 0,
            lockedUntil,
            nowIso(),
            nowIso(),
        ]);
        return id;
    }
    l1GetSessionState(sessionId, stateKey) {
        const row = this.dictRow(`SELECT state_value FROM session_state WHERE session_id = ? AND state_key = ? AND (locked_until IS NULL OR locked_until > datetime('now'))`, [sessionId, stateKey]);
        if (!row)
            return null;
        try {
            return JSON.parse(row.state_value);
        }
        catch {
            return row.state_value;
        }
    }
    l1DeleteSessionState(sessionId, stateKey) {
        this.execute(`DELETE FROM session_state WHERE session_id = ? AND state_key = ?`, [sessionId, stateKey]);
    }
    l1ListSessionStates(sessionId) {
        const rows = this.listRows(`SELECT state_key, state_value, updated_at FROM session_state WHERE session_id = ?`, [sessionId]);
        return rows.map(row => ({
            key: row.state_key,
            value: JSON.parse(row.state_value),
            updatedAt: row.updated_at,
        }));
    }
    l1AcquireLock(p) {
        const timeout = p.timeoutSeconds || 60;
        const lockedUntil = `datetime('now', '+${timeout} seconds')`;
        const existing = this.dictRow(`SELECT locked_until FROM session_state WHERE session_id = ? AND state_key = ?`, [p.sessionId, p.lockKey]);
        if (existing && existing.locked_until && existing.locked_until > new Date().toISOString()) {
            return false;
        }
        this.execute(`INSERT OR REPLACE INTO session_state 
       (id, session_id, state_key, state_value, state_type, locked_until, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [uuid(), p.sessionId, p.lockKey, 'locked', 'lock', lockedUntil, nowIso(), nowIso()]);
        return true;
    }
    l1ReleaseLock(sessionId, lockKey) {
        this.execute(`DELETE FROM session_state WHERE session_id = ? AND state_key = ? AND state_type = 'lock'`, [sessionId, lockKey]);
    }
    // ─── L3: Semantic Memory Hybrid Search ──────────────────────────────────────
    l3FtsSearch(p) {
        const limit = p.limit || 20;
        try {
            const results = this.listRows(`SELECT 
           session_id,
           memory_text,
           entity_name,
           fact_text,
           rank
         FROM semantic_fts
         WHERE session_id = ? AND semantic_fts MATCH ?
         ORDER BY rank
         LIMIT ?`, [p.sessionId, p.query, limit]);
            return results.map((row, idx) => ({
                sourceId: `${row.session_id}_${idx}`,
                sourceType: 'semantic',
                score: row.rank,
                content: row.memory_text || row.entity_name || row.fact_text || '',
            }));
        }
        catch {
            return [];
        }
    }
    l3HybridSearch(p) {
        const limit = p.limit || 20;
        const rrfK = p.rrfK || 60;
        const ftsResults = this.l3FtsSearch({ sessionId: p.sessionId, query: p.query, limit });
        const ftsMap = new Map(ftsResults.map((r, i) => [r.sourceId, { ...r, rank: i + 1 }]));
        let vecResults = [];
        if (p.queryEmbedding && this.vecEnabled) {
            vecResults = this.vectorSearch({
                sessionId: p.sessionId,
                queryEmbedding: p.queryEmbedding,
                limit,
            });
        }
        const vecMap = new Map(vecResults.map((r, i) => [r.sourceId, { ...r, rank: i + 1 }]));
        const allIds = new Set([...ftsMap.keys(), ...vecMap.keys()]);
        const fusedResults = [];
        for (const id of allIds) {
            const ftsRank = ftsMap.get(id)?.rank || Infinity;
            const vecRank = vecMap.get(id)?.rank || Infinity;
            const ftsScore = ftsRank !== Infinity ? rrfK / (rrfK + ftsRank) : 0;
            const vecScore = vecRank !== Infinity ? rrfK / (rrfK + vecRank) : 0;
            const combinedScore = (ftsScore + vecScore) / 2;
            const sourceType = ftsMap.get(id)?.sourceType || vecMap.get(id)?.sourceType || 'unknown';
            const content = ftsMap.get(id)?.content || '';
            fusedResults.push({ sourceId: id, sourceType, score: combinedScore, content });
        }
        return fusedResults.sort((a, b) => b.score - a.score).slice(0, limit);
    }
    l3IndexSemanticContent(p) {
        try {
            this.execute(`INSERT INTO semantic_fts (session_id, memory_text, entity_name, fact_text)
         VALUES (?, ?, ?, ?)`, [p.sessionId, p.memoryText || null, p.entityName || null, p.factText || null]);
        }
        catch {
        }
    }
    // ─── File-based Storage Index (L4/L5/L6) ────────────────────────────────────
    fileIndexCreate(p) {
        const id = uuid();
        let blob = null;
        if (this.vecEnabled && p.embedding) {
            blob = Buffer.from(new Float32Array(p.embedding).buffer);
        }
        this.execute(`INSERT INTO file_index 
       (id, session_id, layer, file_type, file_path, title, summary, tags, embedding, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            p.sessionId,
            p.layer,
            p.fileType,
            p.filePath,
            p.title || null,
            p.summary || null,
            p.tags ? JSON.stringify(p.tags) : null,
            blob,
            p.version || '1.0',
            nowIso(),
            nowIso(),
        ]);
        return id;
    }
    fileIndexUpdate(p) {
        const updates = ['updated_at = ?'];
        const params = [nowIso()];
        if (p.title !== undefined) {
            updates.push('title = ?');
            params.push(p.title);
        }
        if (p.summary !== undefined) {
            updates.push('summary = ?');
            params.push(p.summary);
        }
        if (p.tags !== undefined) {
            updates.push('tags = ?');
            params.push(p.tags ? JSON.stringify(p.tags) : null);
        }
        if (p.embedding && this.vecEnabled) {
            updates.push('embedding = ?');
            params.push(Buffer.from(new Float32Array(p.embedding).buffer));
        }
        if (p.version !== undefined) {
            updates.push('version = ?');
            params.push(p.version);
        }
        params.push(p.id, p.sessionId);
        this.execute(`UPDATE file_index SET ${updates.join(', ')} WHERE id = ? AND session_id = ?`, params);
    }
    fileIndexList(p) {
        const limit = p.limit || 50;
        const sql = p.layer
            ? `SELECT id, layer, file_path, file_type, title, summary, tags, version, updated_at FROM file_index WHERE session_id = ? AND layer = ? ORDER BY updated_at DESC LIMIT ?`
            : `SELECT id, layer, file_path, file_type, title, summary, tags, version, updated_at FROM file_index WHERE session_id = ? ORDER BY updated_at DESC LIMIT ?`;
        const params = p.layer ? [p.sessionId, p.layer, limit] : [p.sessionId, limit];
        const rows = this.listRows(sql, params);
        return rows.map(row => ({
            id: row.id,
            layer: row.layer,
            filePath: row.file_path,
            fileType: row.file_type,
            title: row.title || '',
            summary: row.summary || '',
            tags: row.tags ? JSON.parse(row.tags) : [],
            version: row.version,
            updatedAt: row.updated_at,
        }));
    }
    fileIndexDelete(id, sessionId) {
        this.execute(`DELETE FROM file_index WHERE id = ? AND session_id = ?`, [id, sessionId]);
    }
    fileIndexSearch(p) {
        const limit = p.limit || 20;
        const q = `%${p.query}%`;
        let sql = `
      SELECT id, layer, file_path, title, summary 
      FROM file_index 
      WHERE session_id = ? 
        AND (title LIKE ? OR summary LIKE ?)`;
        const params = [p.sessionId, q, q];
        if (p.layer) {
            sql += ` AND layer = ?`;
            params.push(p.layer);
        }
        sql += ` ORDER BY updated_at DESC LIMIT ?`;
        params.push(limit);
        return this.listRows(sql, params).map(row => ({
            id: row.id,
            layer: row.layer,
            filePath: row.file_path,
            title: row.title || '',
            summary: row.summary || '',
        }));
    }
}
//# sourceMappingURL=store.js.map