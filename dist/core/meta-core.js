/**
 * meta-core.ts — Business logic facade for metacognitive memory.
 * Provides async initialization around MemoryStore with vector support.
 */
import { join } from "node:path";
import { MemoryStore } from "./store.js";
export class MetaCore {
    store;
    ready;
    constructor(cfg) {
        const dbPath = join(cfg.stateDir, "metacognitive_memory", "memory.db");
        this.store = new MemoryStore(dbPath);
        this.ready = this.store.initialize();
    }
    async initialize() {
        await this.ready;
    }
    // ─── L0 ────────────────────────────────────────────────────────────────────
    l0Capture(p) {
        return this.store.l0Capture(p);
    }
    l0List(sessionId, limit = 50) {
        return this.store.l0List(sessionId, limit);
    }
    l0ListAll(limit = 50) {
        return this.store.l0ListAll(limit);
    }
    // ─── L1 ────────────────────────────────────────────────────────────────────
    l1Extract(sessionId, maxMemories = 30) {
        return this.store.l1Extract(sessionId, maxMemories);
    }
    l1List(sessionId, memoryType, limit = 50) {
        return this.store.l1List(sessionId, memoryType, limit);
    }
    l1ListAll(limit = 50) {
        return this.store.l1ListAll(limit);
    }
    l1AddEmbedding(p) {
        return this.store.l1AddEmbedding(p);
    }
    // L1 Session State Management
    l1SetSessionState(p) {
        return this.store.l1SetSessionState(p);
    }
    l1GetSessionState(sessionId, stateKey) {
        return this.store.l1GetSessionState(sessionId, stateKey);
    }
    l1DeleteSessionState(sessionId, stateKey) {
        return this.store.l1DeleteSessionState(sessionId, stateKey);
    }
    l1ListSessionStates(sessionId) {
        return this.store.l1ListSessionStates(sessionId);
    }
    l1AcquireLock(p) {
        return this.store.l1AcquireLock(p);
    }
    l1ReleaseLock(sessionId, lockKey) {
        return this.store.l1ReleaseLock(sessionId, lockKey);
    }
    // ─── L2 ────────────────────────────────────────────────────────────────────
    l2CreateScene(p) {
        return this.store.l2CreateScene(p);
    }
    l2ListScenes(sessionId, sceneType, limit = 50) {
        return this.store.l2ListScenes(sessionId, sceneType, limit);
    }
    // ─── L3 ────────────────────────────────────────────────────────────────────
    l3UpdateGraph(sessionId) {
        return this.store.l3UpdateGraph(sessionId);
    }
    l3ListEntities(sessionId, entityType, limit = 50) {
        return this.store.l3ListEntities(sessionId, entityType, limit);
    }
    l3ListRelations(sessionId, fromEntityId, limit = 50) {
        return this.store.l3ListRelations(sessionId, fromEntityId, limit);
    }
    l3AddEntityEmbedding(p) {
        return this.store.l3AddEntityEmbedding(p);
    }
    // L3 Hybrid Search (BM25 + Vector RRF)
    l3FtsSearch(p) {
        return this.store.l3FtsSearch(p);
    }
    l3HybridSearch(p) {
        return this.store.l3HybridSearch(p);
    }
    l3IndexSemanticContent(p) {
        return this.store.l3IndexSemanticContent(p);
    }
    // ─── L4 ────────────────────────────────────────────────────────────────────
    l4CreateGoal(p) {
        return this.store.l4CreateGoal(p);
    }
    l4Tree(sessionId) {
        return this.store.l4Tree(sessionId);
    }
    l4UpdateGoal(p) {
        return this.store.l4UpdateGoal(p);
    }
    l4DeleteGoal(goalId, sessionId) {
        return this.store.l4DeleteGoal(goalId, sessionId);
    }
    // ─── L5 ────────────────────────────────────────────────────────────────────
    l5AddFact(p) {
        return this.store.l5AddFact(p);
    }
    l5Search(sessionId, query, limit = 20) {
        return this.store.l5Search(sessionId, query, limit);
    }
    l5VectorSearch(p) {
        return this.store.l5VectorSearch(p);
    }
    l5VerifyFact(factId, sessionId) {
        return this.store.l5VerifyFact(factId, sessionId);
    }
    l5ListFacts(sessionId, domain, limit = 50) {
        return this.store.l5ListFacts(sessionId, domain, limit);
    }
    l5DeleteFact(factId, sessionId) {
        return this.store.l5DeleteFact(factId, sessionId);
    }
    // ─── L6 ────────────────────────────────────────────────────────────────────
    l6LogError(p) {
        return this.store.l6LogError(p);
    }
    l6SelfCheck(sessionId) {
        return this.store.l6SelfCheck(sessionId);
    }
    // ─── Data Purge & Maintenance ────────────────────────────────────────────────
    purgeOldByAge(days, sessionId) {
        return this.store.purgeOldByAge(days, sessionId);
    }
    purgeByFrequency(minFrequency, maxDays, sessionId) {
        return this.store.purgeByFrequency(minFrequency, maxDays, sessionId);
    }
    smartPurge(config = {}) {
        return this.store.smartPurge(config);
    }
    getStorageStats() {
        return this.store.getStorageStats();
    }
    // ─── File-based Storage Index (L4/L5/L6) ────────────────────────────────────
    fileIndexCreate(p) {
        return this.store.fileIndexCreate(p);
    }
    fileIndexUpdate(p) {
        return this.store.fileIndexUpdate(p);
    }
    fileIndexList(p) {
        return this.store.fileIndexList(p);
    }
    fileIndexDelete(id, sessionId) {
        return this.store.fileIndexDelete(id, sessionId);
    }
    fileIndexSearch(p) {
        return this.store.fileIndexSearch(p);
    }
    async close() {
        await this.store.close();
    }
}
//# sourceMappingURL=meta-core.js.map