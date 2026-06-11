/**
 * metacognitive-memory OpenClaw plugin — L0~L6 six-layer cognitive memory.
 * Uses sql.js WASM SQLite, zero native dependencies, cross-device portable.
 */
import { Type } from "typebox";
import { definePluginEntry, jsonResult } from "openclaw/plugin-sdk/core";
import { MetaCore } from "./core/meta-core.js";
import { OpenClawHostAdapter } from "./adapters/openclaw/host-adapter.js";
// Singleton core instance (per plugin process)
let core = null;
let coreReady = null;
let initStarted = false;
export function getOrCreateCore(api) {
    if (core)
        return core;
    const hostAdapter = new OpenClawHostAdapter({
        api,
        pluginDataDir: "metacognitive_memory",
        openclawConfig: api.config,
    });
    core = new MetaCore({
        stateDir: hostAdapter.stateDir,
    });
    coreReady = core.initialize().catch((err) => {
        api.logger.error(`[metacognitive-memory] Core init failed: ${err}`);
        throw err;
    });
    return core;
}
export function toolParams(schema) {
    return Type.Object(schema);
}
// ─── Memory Type aliases for tool parameters ──────────────────────────────────
const MemoryTypeEnum = Type.Union([
    Type.Literal("preference"),
    Type.Literal("fact"),
    Type.Literal("decision"),
    Type.Literal("context"),
    Type.Literal("instruction"),
]);
const SceneTypeEnum = Type.Union([
    Type.Literal("project"),
    Type.Literal("decision"),
    Type.Literal("interaction"),
    Type.Literal("error"),
    Type.Literal("growth"),
]);
const EntityTypeEnum = Type.Union([
    Type.Literal("person"),
    Type.Literal("project"),
    Type.Literal("supplier"),
    Type.Literal("decision"),
    Type.Literal("event"),
    Type.Literal("concept"),
]);
const GoalStatusEnum = Type.Union([
    Type.Literal("pending"),
    Type.Literal("in_progress"),
    Type.Literal("blocked"),
    Type.Literal("done"),
    Type.Literal("cancelled"),
]);
const ErrorTypeEnum = Type.Union([
    Type.Literal("sql_error"),
    Type.Literal("config_error"),
    Type.Literal("logic_error"),
    Type.Literal("tool_error"),
    Type.Literal("recall_error"),
]);
// ─── Tool definitions ─────────────────────────────────────────────────────────
export const tools = [
    // ── L0 ────────────────────────────────────────────────────────────────────
    ["l0_capture", "Capture raw conversation log", {
            session_id: Type.String(),
            role: Type.Union([Type.Literal("user"), Type.Literal("assistant"), Type.Literal("system"), Type.Literal("tool")]),
            content: Type.String(),
            tool_name: Type.Optional(Type.String()),
            tool_result: Type.Optional(Type.String()),
        }],
    ["l0_list", "List raw conversation logs", {
            session_id: Type.String(),
            limit: Type.Optional(Type.Number({ default: 50 })),
        }],
    ["l0_list_all", "List raw logs from ALL sessions (cross-session recall)", {
            limit: Type.Optional(Type.Number({ default: 50 })),
        }],
    // ── L1 ───────────────────────────────────────────────────────────────────────
    ["l1_extract", "Extract structured memories from raw logs", {
            session_id: Type.String(),
            max_memories: Type.Optional(Type.Number({ default: 30 })),
        }],
    ["l1_list", "List extracted memories", {
            session_id: Type.String(),
            memory_type: Type.Optional(MemoryTypeEnum),
            limit: Type.Optional(Type.Number({ default: 50 })),
        }],
    ["l1_list_all", "List extracted memories from ALL sessions (cross-session recall)", {
            limit: Type.Optional(Type.Number({ default: 50 })),
        }],
    ["l1_set_session_state", "Set session state/context (for task persistence)", {
            session_id: Type.String(),
            state_key: Type.String(),
            state_value: Type.Any(),
            state_type: Type.Optional(Type.String({ default: "json" })),
            ttl_seconds: Type.Optional(Type.Number()),
            checkpoint_pos: Type.Optional(Type.Number()),
        }],
    ["l1_get_session_state", "Get session state/context", {
            session_id: Type.String(),
            state_key: Type.String(),
        }],
    ["l1_delete_session_state", "Delete session state", {
            session_id: Type.String(),
            state_key: Type.String(),
        }],
    ["l1_list_session_states", "List all session states", {
            session_id: Type.String(),
        }],
    ["l1_acquire_lock", "Acquire a distributed lock for critical section", {
            session_id: Type.String(),
            lock_key: Type.String(),
            timeout_seconds: Type.Optional(Type.Number({ default: 60 })),
        }],
    ["l1_release_lock", "Release a distributed lock", {
            session_id: Type.String(),
            lock_key: Type.String(),
        }],
    // ── L2 ───────────────────────────────────────────────────────────────────────
    ["l2_create_scene", "Create a narrative scene block", {
            session_id: Type.String(),
            scene_type: SceneTypeEnum,
            title: Type.String(),
            background: Type.Optional(Type.String()),
            decision: Type.Optional(Type.String()),
            result: Type.Optional(Type.String()),
        }],
    ["l2_list_scenes", "List scene blocks", {
            session_id: Type.String(),
            scene_type: Type.Optional(SceneTypeEnum),
            limit: Type.Optional(Type.Number({ default: 50 })),
        }],
    // ── L3 ────────────────────────────────────────────────────────────────────
    ["l3_update_graph", "Update cognitive graph from memories", {
            session_id: Type.String(),
        }],
    ["l3_list_entities", "List knowledge graph entities", {
            session_id: Type.String(),
            entity_type: Type.Optional(EntityTypeEnum),
            limit: Type.Optional(Type.Number({ default: 50 })),
        }],
    ["l3_list_relations", "List knowledge graph relations", {
            session_id: Type.String(),
            from_entity_id: Type.Optional(Type.String()),
            limit: Type.Optional(Type.Number({ default: 50 })),
        }],
    ["l3_fts_search", "FTS5 full-text search on semantic memory", {
            session_id: Type.String(),
            query: Type.String(),
            limit: Type.Optional(Type.Number({ default: 20 })),
        }],
    ["l3_hybrid_search", "Hybrid search (BM25 + Vector RRF fusion)", {
            session_id: Type.String(),
            query: Type.String(),
            query_embedding: Type.Optional(Type.Array(Type.Number())),
            limit: Type.Optional(Type.Number({ default: 20 })),
            rrf_k: Type.Optional(Type.Number({ default: 60 })),
        }],
    // ── L4 ─────────────────────────────────────────────────────────────────────
    ["l4_create_goal", "Create a goal in the tracking tree", {
            session_id: Type.String(),
            title: Type.String(),
            description: Type.Optional(Type.String()),
            parent_id: Type.Optional(Type.String()),
            priority: Type.Optional(Type.Number({ default: 2 })),
        }],
    ["l4_tree", "Get full goal tree (recursive)", {
            session_id: Type.String(),
        }],
    ["l4_update_goal", "Update a goal's status/blocker/priority", {
            goal_id: Type.String(),
            session_id: Type.String(),
            status: Type.Optional(GoalStatusEnum),
            blocker: Type.Optional(Type.String()),
            priority: Type.Optional(Type.Number()),
        }],
    ["l4_delete_goal", "Delete a goal and its subtree", {
            goal_id: Type.String(),
            session_id: Type.String(),
        }],
    // ── L5 ────────────────────────────────────────────────────────────────────────────
    ["l5_add_fact", "Add a fact to the knowledge base", {
            session_id: Type.String(),
            domain: Type.String(),
            fact_text: Type.String(),
            confidence: Type.Optional(Type.Number({ default: 0.8 })),
            tags: Type.Optional(Type.Array(Type.String())),
        }],
    ["l5_search", "Search the knowledge base", {
            session_id: Type.String(),
            query: Type.String(),
            limit: Type.Optional(Type.Number({ default: 20 })),
        }],
    ["l5_verify_fact", "Mark a knowledge fact as verified", {
            fact_id: Type.String(),
            session_id: Type.String(),
        }],
    ["l5_list_facts", "List knowledge facts", {
            session_id: Type.String(),
            domain: Type.Optional(Type.String()),
            limit: Type.Optional(Type.Number({ default: 50 })),
        }],
    ["l5_delete_fact", "Delete a knowledge fact", {
            fact_id: Type.String(),
            session_id: Type.String(),
        }],
    ["l5_vector_search", "Vector similarity search on knowledge facts (requires sqlite-vec)", {
            session_id: Type.String(),
            query_embedding: Type.Array(Type.Number()),
            limit: Type.Optional(Type.Number({ default: 10 })),
        }],
    // ── Vector Embeddings ───────────────────────────────────────────────────────
    ["l1_add_embedding", "Add embedding vector to L1 memory", {
            session_id: Type.String(),
            memory_id: Type.String(),
            embedding: Type.Array(Type.Number()),
        }],
    ["l3_add_entity_embedding", "Add embedding vector to L3 entity", {
            session_id: Type.String(),
            entity_id: Type.String(),
            embedding: Type.Array(Type.Number()),
        }],
    // ── L6 ─────────────────────────────────────────────────────────────────────
    ["l6_log_error", "Log an error to the self-model", {
            session_id: Type.String(),
            error_type: ErrorTypeEnum,
            summary: Type.String(),
            detail: Type.Optional(Type.String()),
            stack_trace: Type.Optional(Type.String()),
        }],
    ["l6_self_check", "Run self-diagnostic and return error/capability summary", {
            session_id: Type.String(),
        }],
    // ── File Index (L4/L5/L6) ───────────────────────────────────────────────────
    ["file_index_create", "Create file index entry for L4/L5/L6 file-based storage", {
            session_id: Type.String(),
            layer: Type.String(),
            file_path: Type.String(),
            file_type: Type.String(),
            title: Type.Optional(Type.String()),
            summary: Type.Optional(Type.String()),
            tags: Type.Optional(Type.Array(Type.String())),
            embedding: Type.Optional(Type.Array(Type.Number())),
            version: Type.Optional(Type.String({ default: "1.0" })),
        }],
    ["file_index_update", "Update file index entry", {
            id: Type.String(),
            session_id: Type.String(),
            title: Type.Optional(Type.String()),
            summary: Type.Optional(Type.String()),
            tags: Type.Optional(Type.Array(Type.String())),
            embedding: Type.Optional(Type.Array(Type.Number())),
            version: Type.Optional(Type.String()),
        }],
    ["file_index_list", "List file index entries", {
            session_id: Type.String(),
            layer: Type.Optional(Type.String()),
            limit: Type.Optional(Type.Number({ default: 50 })),
        }],
    ["file_index_delete", "Delete file index entry", {
            id: Type.String(),
            session_id: Type.String(),
        }],
    ["file_index_search", "Search file index entries", {
            session_id: Type.String(),
            query: Type.String(),
            layer: Type.Optional(Type.String()),
            limit: Type.Optional(Type.Number({ default: 20 })),
        }],
    // ── Maintenance & Purge ──────────────────────────────────────────────────────
    ["purge_old_by_age", "Purge memory data older than specified days", {
            days: Type.Number({ minimum: 1, maximum: 365 }),
            session_id: Type.Optional(Type.String()),
        }],
    ["purge_by_frequency", "Purge low-frequency entities (L3) based on access count", {
            min_frequency: Type.Number({ minimum: 1, maximum: 100 }),
            max_days: Type.Number({ minimum: 1, maximum: 365 }),
            session_id: Type.Optional(Type.String()),
        }],
    ["smart_purge", "Smart purge based on frequency/importance: high freq keeps longer", {
            default_retention_days: Type.Optional(Type.Number({ default: 90 })),
            high_freq_retention_days: Type.Optional(Type.Number({ default: 180 })),
            medium_freq_retention_days: Type.Optional(Type.Number({ default: 90 })),
            low_freq_retention_days: Type.Optional(Type.Number({ default: 30 })),
            high_freq_threshold: Type.Optional(Type.Number({ default: 10 })),
            medium_freq_threshold: Type.Optional(Type.Number({ default: 3 })),
            session_id: Type.Optional(Type.String()),
        }],
    ["get_storage_stats", "Get storage statistics for all memory layers", {}],
];
export function buildExecuteHandler(api) {
    return function handleTool(name, params) {
        const m = getOrCreateCore(api);
        switch (name) {
            // L0
            case "l0_capture":
                return m.l0Capture({
                    sessionId: String(params.session_id),
                    role: String(params.role),
                    content: String(params.content),
                    toolName: params.tool_name ? String(params.tool_name) : undefined,
                    toolResult: params.tool_result ? String(params.tool_result) : undefined,
                });
            case "l0_list":
                return m.l0List(String(params.session_id), params.limit ? Number(params.limit) : 50);
            case "l0_list_all":
                return m.l0ListAll(params.limit ? Number(params.limit) : 50);
            // L1
            case "l1_extract":
                return { extracted: m.l1Extract(String(params.session_id), params.max_memories ? Number(params.max_memories) : 30) };
            case "l1_list":
                return m.l1List(String(params.session_id), params.memory_type ? String(params.memory_type) : undefined, params.limit ? Number(params.limit) : 50);
            case "l1_list_all":
                return m.l1ListAll(params.limit ? Number(params.limit) : 50);
            // L1 Session State
            case "l1_set_session_state":
                return { id: m.l1SetSessionState({
                    sessionId: String(params.session_id),
                    stateKey: String(params.state_key),
                    stateValue: params.state_value,
                    stateType: params.state_type ? String(params.state_type) : undefined,
                    ttlSeconds: params.ttl_seconds ? Number(params.ttl_seconds) : undefined,
                    checkpointPos: params.checkpoint_pos ? Number(params.checkpoint_pos) : undefined,
                }) };
            case "l1_get_session_state":
                return { value: m.l1GetSessionState(String(params.session_id), String(params.state_key)) };
            case "l1_delete_session_state":
                m.l1DeleteSessionState(String(params.session_id), String(params.state_key));
                return { deleted: true };
            case "l1_list_session_states":
                return m.l1ListSessionStates(String(params.session_id));
            case "l1_acquire_lock":
                return { acquired: m.l1AcquireLock({
                    sessionId: String(params.session_id),
                    lockKey: String(params.lock_key),
                    timeoutSeconds: params.timeout_seconds ? Number(params.timeout_seconds) : undefined,
                }) };
            case "l1_release_lock":
                m.l1ReleaseLock(String(params.session_id), String(params.lock_key));
                return { released: true };
            // L2
            case "l2_create_scene":
                return { scene_id: m.l2CreateScene({
                        sessionId: String(params.session_id),
                        sceneType: String(params.scene_type),
                        title: String(params.title),
                        background: params.background ? String(params.background) : undefined,
                        decision: params.decision ? String(params.decision) : undefined,
                        result: params.result ? String(params.result) : undefined,
                    }) };
            case "l2_list_scenes":
                return m.l2ListScenes(String(params.session_id), params.scene_type ? String(params.scene_type) : undefined, params.limit ? Number(params.limit) : 50);
            // L3
            case "l3_update_graph":
                return m.l3UpdateGraph(String(params.session_id));
            case "l3_list_entities":
                return m.l3ListEntities(String(params.session_id), params.entity_type ? String(params.entity_type) : undefined, params.limit ? Number(params.limit) : 50);
            case "l3_list_relations":
                return m.l3ListRelations(String(params.session_id), params.from_entity_id ? String(params.from_entity_id) : undefined, params.limit ? Number(params.limit) : 50);
            case "l3_fts_search":
                return m.l3FtsSearch({
                    sessionId: String(params.session_id),
                    query: String(params.query),
                    limit: params.limit ? Number(params.limit) : 20,
                });
            case "l3_hybrid_search":
                return m.l3HybridSearch({
                    sessionId: String(params.session_id),
                    query: String(params.query),
                    queryEmbedding: params.query_embedding ? params.query_embedding.map(Number) : undefined,
                    limit: params.limit ? Number(params.limit) : 20,
                    rrfK: params.rrf_k ? Number(params.rrf_k) : 60,
                });
            // L4
            case "l4_create_goal":
                return { goal_id: m.l4CreateGoal({
                        sessionId: String(params.session_id),
                        title: String(params.title),
                        description: params.description ? String(params.description) : undefined,
                        parentId: params.parent_id ? String(params.parent_id) : undefined,
                        priority: params.priority ? Number(params.priority) : undefined,
                    }) };
            case "l4_tree":
                return m.l4Tree(String(params.session_id));
            case "l4_update_goal":
                m.l4UpdateGoal({
                    goalId: String(params.goal_id),
                    sessionId: String(params.session_id),
                    status: params.status ? String(params.status) : undefined,
                    blocker: params.blocker !== undefined ? String(params.blocker) : undefined,
                    priority: params.priority !== undefined ? Number(params.priority) : undefined,
                });
                return { updated: true };
            case "l4_delete_goal":
                m.l4DeleteGoal(String(params.goal_id), String(params.session_id));
                return { deleted: true };
            // L5
            case "l5_add_fact":
                return { fact_id: m.l5AddFact({
                        sessionId: String(params.session_id),
                        domain: String(params.domain),
                        factText: String(params.fact_text),
                        confidence: params.confidence ? Number(params.confidence) : undefined,
                        tags: params.tags ? params.tags.map(String) : undefined,
                    }) };
            case "l5_search":
                return m.l5Search(String(params.session_id), String(params.query), params.limit ? Number(params.limit) : 20);
            case "l5_verify_fact":
                m.l5VerifyFact(String(params.fact_id), String(params.session_id));
                return { verified: true };
            case "l5_list_facts":
                return m.l5ListFacts(String(params.session_id), params.domain ? String(params.domain) : undefined, params.limit ? Number(params.limit) : 50);
            case "l5_delete_fact":
                m.l5DeleteFact(String(params.fact_id), String(params.session_id));
                return { deleted: true };
            case "l5_vector_search":
                return m.l5VectorSearch({
                    sessionId: String(params.session_id),
                    queryEmbedding: params.query_embedding ? params.query_embedding.map(Number) : [],
                    limit: params.limit ? Number(params.limit) : 10,
                });
            case "l1_add_embedding":
                m.l1AddEmbedding({
                    sessionId: String(params.session_id),
                    memoryId: String(params.memory_id),
                    embedding: params.embedding ? params.embedding.map(Number) : [],
                });
                return { added: true };
            case "l3_add_entity_embedding":
                m.l3AddEntityEmbedding({
                    sessionId: String(params.session_id),
                    entityId: String(params.entity_id),
                    embedding: params.embedding ? params.embedding.map(Number) : [],
                });
                return { added: true };
            // L6
            case "l6_log_error":
                return { error_id: m.l6LogError({
                        sessionId: String(params.session_id),
                        errorType: String(params.error_type),
                        summary: String(params.summary),
                        detail: params.detail ? String(params.detail) : undefined,
                        stackTrace: params.stack_trace ? String(params.stack_trace) : undefined,
                    }) };
            case "l6_self_check":
                return m.l6SelfCheck(String(params.session_id));
            // File Index
            case "file_index_create":
                return { id: m.fileIndexCreate({
                    sessionId: String(params.session_id),
                    layer: String(params.layer),
                    filePath: String(params.file_path),
                    fileType: String(params.file_type),
                    title: params.title ? String(params.title) : undefined,
                    summary: params.summary ? String(params.summary) : undefined,
                    tags: params.tags ? params.tags.map(String) : undefined,
                    embedding: params.embedding ? params.embedding.map(Number) : undefined,
                    version: params.version ? String(params.version) : undefined,
                }) };
            case "file_index_update":
                m.fileIndexUpdate({
                    id: String(params.id),
                    sessionId: String(params.session_id),
                    title: params.title,
                    summary: params.summary,
                    tags: params.tags ? params.tags.map(String) : undefined,
                    embedding: params.embedding ? params.embedding.map(Number) : undefined,
                    version: params.version,
                });
                return { updated: true };
            case "file_index_list":
                return m.fileIndexList({
                    sessionId: String(params.session_id),
                    layer: params.layer ? String(params.layer) : undefined,
                    limit: params.limit ? Number(params.limit) : undefined,
                });
            case "file_index_delete":
                m.fileIndexDelete(String(params.id), String(params.session_id));
                return { deleted: true };
            case "file_index_search":
                return m.fileIndexSearch({
                    sessionId: String(params.session_id),
                    query: String(params.query),
                    layer: params.layer ? String(params.layer) : undefined,
                    limit: params.limit ? Number(params.limit) : undefined,
                });
            // Maintenance
            case "purge_old_by_age":
                return m.purgeOldByAge(Number(params.days), params.session_id ? String(params.session_id) : null);
            case "purge_by_frequency":
                return m.purgeByFrequency(Number(params.min_frequency), Number(params.max_days), params.session_id ? String(params.session_id) : null);
            case "smart_purge":
                return m.smartPurge({
                    defaultRetentionDays: params.default_retention_days ? Number(params.default_retention_days) : 90,
                    highFreqRetentionDays: params.high_freq_retention_days ? Number(params.high_freq_retention_days) : 180,
                    mediumFreqRetentionDays: params.medium_freq_retention_days ? Number(params.medium_freq_retention_days) : 90,
                    lowFreqRetentionDays: params.low_freq_retention_days ? Number(params.low_freq_retention_days) : 30,
                    highFreqThreshold: params.high_freq_threshold ? Number(params.high_freq_threshold) : 10,
                    mediumFreqThreshold: params.medium_freq_threshold ? Number(params.medium_freq_threshold) : 3,
                    sessionId: params.session_id ? String(params.session_id) : null,
                });
            case "get_storage_stats":
                return m.getStorageStats();
            default:
                return { error: `Unknown tool: ${name}` };
        }
    };
}
export default definePluginEntry({
    id: "metacognitive-memory",
    name: "Metacognitive Memory",
    description: "L0~L6 cognitive memory system with privacy controls. " +
        "Captures and structures conversation content ONLY when allowConversationAccess=true. " +
        "Stores raw logs (L0), extracted memories (L1), scenes (L2), cognitive graphs (L3), " +
        "goal trees (L4), knowledge base (L5), and self-model diagnostics (L6). " +
        "WARNING: May contain sensitive data. Review before enabling in workspaces with " +
        "credentials, regulated data, or proprietary prompts. Use allowConversationAccess=false " +
        "and manual l0_capture for sensitive contexts.",
    register(api) {
        if (initStarted) {
            api.logger.info("[metacognitive-memory] register() called again, skipping (already initialized)");
            return;
        }
        initStarted = true;
        api.logger.info("[metacognitive-memory] === Plugin initialization started ===");
        
        api.logger.info("[metacognitive-memory] Creating core instance...");
        const core = getOrCreateCore(api);
        
        api.logger.info("[metacognitive-memory] Initializing memory store...");
        const initPromise = core.initialize();
        
        api.logger.info("[metacognitive-memory] Building tool handler...");
        const handler = buildExecuteHandler(api);
        
        // ── Sensitive data redaction ───────────────────────────────────────────
        const REDACT_PATTERNS = [
            /([A-Za-z0-9]{20,}=*[A-Za-z0-9+/=]{20,})/g, // API keys, tokens
            /(sk-[A-Za-z0-9_-]{20,})/g, // OpenAI keys
            /(password|passwd|pwd)[;:]\s*\S+/gi, // password: xxx
            /(Bearer|Token|Basic)\s+[A-Za-z0-9_.-]+/gi, // Auth headers
            /(\d{3}-\d{2}-\d{4})/g, // SSN
            /(\d{16,19})\s+\d{2}\/\d{2}/g, // Credit card
        ];
        function redact(content) {
            let redacted = content;
            for (const pattern of REDACT_PATTERNS) {
                redacted = redacted.replace(pattern, "[REDACTED]");
            }
            return redacted;
        }
        // ── Conversation hooks — require explicit opt-in ─────────────────────
        const hooksConfig = api.pluginConfig;
        const allowCapture = hooksConfig?.allowConversationAccess === true;
        const everyNConversations = hooksConfig?.everyNConversations ?? 3;
        const l3UpdateThreshold = hooksConfig?.l3UpdateThreshold ?? 5;
        
        let turnsSinceLastL1Extract = 0;
        let l1CountSinceLastL3Update = 0;
        
        const tryAutoL2Scene = (sessionKey, l1Memories) => {
            try {
                const decisions = l1Memories.filter(m => m.memory_type === "decision" || m.memory_type === "instruction");
                const facts = l1Memories.filter(m => m.memory_type === "fact");
                if (decisions.length === 0 && facts.length === 0)
                    return;
                const sceneContent = l1Memories.map(m => `[${m.memory_type}] ${m.memory_text}`).join("\n");
                const sceneType = decisions.length > 0 ? "interaction" : "project";
                const title = decisions.length > 0
                    ? `Session scene: ${decisions.length} decision(s) made`
                    : `Session observation: ${facts.length} fact(s) noted`;
                const background = `L1 memories extracted:\n${sceneContent.substring(0, 500)}`;
                const result = decisions.length > 0
                    ? `Decisions tracked: ${decisions.map(d => d.memory_text).slice(0, 3).join("; ")}`
                    : `Facts noted: ${facts.map(f => f.memory_text).slice(0, 3).join("; ")}`;
                core.l2CreateScene({ sessionId: sessionKey, sceneType, title, background, result });
                api.logger.info("[metacognitive-memory] L2 scene auto-created");
            }
            catch (err) {
                api.logger.error(`[metacognitive-memory] L2 auto-create failed: ${err}`);
            }
        };
        
        const tryAutoL3Graph = (sessionKey, l1Count) => {
            try {
                l1CountSinceLastL3Update += l1Count;
                if (l1CountSinceLastL3Update >= l3UpdateThreshold) {
                    core.l3UpdateGraph(sessionKey);
                    api.logger.info(`[metacognitive-memory] L3 graph auto-updated (${l1CountSinceLastL3Update} L1 memories)`);
                    l1CountSinceLastL3Update = 0;
                }
            }
            catch (err) {
                api.logger.error(`[metacognitive-memory] L3 auto-update failed: ${err}`);
            }
        };
        
        if (allowCapture) {
            api.logger.info("[metacognitive-memory] Conversation capture ENABLED (allowConversationAccess=true)");
            // Internal hook handler — receives InternalHookEvent with { type, action, sessionKey, context }
            const conversationHookHandler = async (event) => {
                try {
                    await initPromise;
                    const { type, action, sessionKey, context } = event;
                    const content = context?.content ?? "";
                    if (!content.trim())
                        return;
                    let role = "user";
                    if (type === "message" && action === "received") {
                        role = "user";
                    }
                    else if (type === "message" && action === "sent") {
                        role = "assistant";
                    }
                    else {
                        return; // Ignore other event types
                    }
                    await core.l0Capture({ sessionId: sessionKey, role, content: redact(content) });
                    
                    // L1 extraction trigger - count ONLY user messages
                    if (role === "user") {
                        turnsSinceLastL1Extract++;
                        api.logger.info(`[metacognitive-memory] Turn counter: ${turnsSinceLastL1Extract}/${everyNConversations}`);
                        if (turnsSinceLastL1Extract >= everyNConversations) {
                            api.logger.info(`[metacognitive-memory] Triggering L1 extraction for session ${sessionKey.substring(0, 20)}`);
                            const l1Count = core.l1Extract(sessionKey, 30);
                            api.logger.info(`[metacognitive-memory] L1 auto-extracted ${l1Count} memories`);
                            turnsSinceLastL1Extract = 0;
                            
                            if (l1Count > 0) {
                                const l1Memories = core.l1List(sessionKey, undefined, l1Count);
                                tryAutoL2Scene(sessionKey, l1Memories);
                                tryAutoL3Graph(sessionKey, l1Count);
                            }
                        }
                    }
                }
                catch (err) {
                    api.logger.error(`[metacognitive-memory] hook error: ${err}`);
                }
            };
            api.logger.info("[metacognitive-memory] Registering conversation hooks...");
            try {
                api.registerHook("message:received", conversationHookHandler, { name: "metacognitive-memory-receive" });
                api.logger.info("[metacognitive-memory] ✓ Hook registered: message:received");
            } catch (err) {
                api.logger.error(`[metacognitive-memory] ✗ Failed to register message:received hook: ${err}`);
            }
            try {
                api.registerHook("message:sent", conversationHookHandler, { name: "metacognitive-memory-sent" });
                api.logger.info("[metacognitive-memory] ✓ Hook registered: message:sent");
            } catch (err) {
                api.logger.error(`[metacognitive-memory] ✗ Failed to register message:sent hook: ${err}`);
            }
            api.logger.info("[metacognitive-memory] Conversation hooks registration completed");
        }
        else {
            api.logger.info("[metacognitive-memory] Conversation capture DISABLED (allowConversationAccess=false or unset). Use manual l0_capture for session logging.");
        }

        // ── Prompt injection hook — inject L1/L4 memory into agent context ────
        api.registerHook("before_prompt_build", async (event, ctx) => {
            try {
                await initPromise;
                const sessionKey = ctx?.sessionKey;
                if (!sessionKey) return;

                const lines = [];

                // Inject L1 memories: fact + preference types (most relevant for identity/preferences)
                const l1Memories = core.l1List(sessionKey, undefined, 20);
                if (l1Memories && l1Memories.length > 0) {
                    const factPref = l1Memories.filter(m => m.memory_type === 'fact' || m.memory_type === 'preference');
                    if (factPref.length > 0) {
                        lines.push('## [Memory Context] Recent Facts & Preferences');
                        for (const m of factPref.slice(0, 8)) {
                            lines.push(`- [${m.memory_type}] ${m.memory_text}`);
                        }
                    }
                }

                // Inject L4 goals: pending + in_progress
                const goals = core.l4Tree(sessionKey);
                if (goals && goals.length > 0) {
                    const activeGoals = goals.filter(g => g.status === 'pending' || g.status === 'in_progress');
                    if (activeGoals.length > 0) {
                        lines.push('## [Memory Context] Active Goals');
                        for (const g of activeGoals.slice(0, 5)) {
                            lines.push(`- [${g.status}] ${g.title}`);
                        }
                    }
                }

                if (lines.length > 0) {
                    api.logger.info(`[metacognitive-memory] Injecting memory context (${lines.length} lines) into prompt`);
                    return { prependContext: lines.join('\n') };
                }
            }
            catch (err) {
                api.logger.error(`[metacognitive-memory] before_prompt_build hook error: ${err}`);
            }
        }, { name: "metacognitive-memory-prompt-inject" });
        api.logger.info("[metacognitive-memory] ✓ Hook registered: before_prompt_build");

        // ── L4: session:patch — cleanup stale goals when session becomes inactive ───
        api.registerHook("session:patch", async (event) => {
            try {
                await initPromise;
                // event.action tells us what changed: "deactivated", "activated", "updated"
                const { sessionKey, action } = event;
                if (!sessionKey) return;
                if (action === 'deactivated') {
                    // Session went inactive — expire goals that have been in progress > 7 days
                    const result = core.l4ExpireGoals(sessionKey, 7);
                    api.logger.info(`[metacognitive-memory] L4 goal cleanup: ${result.cancelled} cancelled, ${result.blocked} blocked`);
                }
            }
            catch (err) {
                api.logger.error(`[metacognitive-memory] session:patch hook error: ${err}`);
            }
        }, { name: "metacognitive-memory-session-patch" });
        api.logger.info("[metacognitive-memory] ✓ Hook registered: session:patch");

        // ── L6: tool_error — auto-record tool execution failures ───
        api.registerHook("tool_error", async (event) => {
            try {
                await initPromise;
                const { sessionKey, toolName, errorMessage, errorType } = event;
                if (!sessionKey) return;
                core.l6LogError({
                    sessionId: sessionKey,
                    errorType: errorType || 'tool_error',
                    summary: `Tool '${toolName}' failed: ${errorMessage}`,
                    detail: errorMessage,
                    context: JSON.stringify({ toolName })
                });
                api.logger.info(`[metacognitive-memory] L6 error logged: ${toolName} — ${errorMessage}`);
            }
            catch (err) {
                api.logger.error(`[metacognitive-memory] tool_error hook error: ${err}`);
            }
        }, { name: "metacognitive-memory-tool-error" });
        api.logger.info("[metacognitive-memory] ✓ Hook registered: tool_error");

        // ── L6: agent_end — update self-model with conversation summary ───
        api.registerHook("agent_end", async (event) => {
            try {
                await initPromise;
                const { sessionKey, turnCount, toolCallCount, errorCount } = event;
                if (!sessionKey) return;
                // Record agent capability observations from this session
                if (turnCount !== undefined && turnCount > 0) {
                    core.l6UpdateSelfModel({
                        sessionId: sessionKey,
                        category: 'capability',
                        content: `Agent completed ${turnCount} turn(s) with ${toolCallCount || 0} tool call(s) and ${errorCount || 0} error(s)`,
                        confidence: 0.8,
                        evidenceCount: 1
                    });
                }
            }
            catch (err) {
                api.logger.error(`[metacognitive-memory] agent_end hook error: ${err}`);
            }
        }, { name: "metacognitive-memory-agent-end" });
        api.logger.info("[metacognitive-memory] ✓ Hook registered: agent_end");

        // ── L5: before_agent_finalize — auto-promote high-confidence L1 facts to knowledge base ───
        api.registerHook("before_agent_finalize", async (event) => {
            try {
                await initPromise;
                const { sessionKey } = event;
                if (!sessionKey) return;
                // Scan recent L1 memories for high-confidence facts (confidence >= 0.9)
                // and auto-promote them to L5 knowledge base
                const l1Memories = core.l1List(sessionKey, undefined, 50);
                if (!l1Memories || l1Memories.length === 0) return;
                // Find fact-type L1s with importance >= 0.9 (high confidence)
                const highConfFacts = l1Memories.filter(m =>
                    m.memory_type === 'fact' && m.importance >= 0.9
                );
                if (highConfFacts.length === 0) return;
                for (const fact of highConfFacts) {
                    // Check if already in L5
                    const existing = core.l5Search(sessionKey, fact.memory_text, 1);
                    if (!existing || existing.length === 0) {
                        core.l5AddFact({
                            sessionId: sessionKey,
                            domain: 'auto_promoted',
                            factText: fact.memory_text,
                            confidence: fact.importance,
                            tags: JSON.stringify(['auto-l1-promoted', fact.memory_type])
                        });
                        api.logger.info(`[metacognitive-memory] L5 auto-promoted: ${fact.memory_text.substring(0, 50)}`);
                    }
                }
            }
            catch (err) {
                api.logger.error(`[metacognitive-memory] before_agent_finalize hook error: ${err}`);
            }
        }, { name: "metacognitive-memory-before-finalize" });
        api.logger.info("[metacognitive-memory] ✓ Hook registered: before_agent_finalize");

        // ── Register all L0~L6 tools ────────────────────────────────────────────
        api.logger.info(`[metacognitive-memory] Registering ${tools.length} tools...`);
        const toolDefs = tools.map(([name, description, schema]) => {
            const td = {
                name,
                label: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                description,
                parameters: toolParams(schema),
                execute: async (_toolCallId, params) => {
                    await initPromise;
                    const result = handler(name, params);
                    return jsonResult(result);
                },
            };
            return td;
        });
        let registeredToolCount = 0;
        for (const t of toolDefs) {
            try {
                api.registerTool(t);
                registeredToolCount++;
            } catch (err) {
                api.logger.error(`[metacognitive-memory] ✗ Failed to register tool ${t.name}: ${err}`);
            }
        }
        api.logger.info(`[metacognitive-memory] ✓ Successfully registered ${registeredToolCount}/${toolDefs.length} tools`);
        api.logger.info("[metacognitive-memory] === Plugin initialization completed ===");
    },
});
//# sourceMappingURL=index.js.map