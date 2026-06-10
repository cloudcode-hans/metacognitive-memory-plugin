/**
 * meta-core.ts — Business logic facade for metacognitive memory.
 * Provides async initialization around MemoryStore.
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
    // ─── L1 ────────────────────────────────────────────────────────────────────
    l1Extract(sessionId, maxMemories = 30) {
        return this.store.l1Extract(sessionId, maxMemories);
    }
    l1List(sessionId, memoryType, limit = 50) {
        return this.store.l1List(sessionId, memoryType, limit);
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
    async close() {
        await this.store.close();
    }
}
//# sourceMappingURL=meta-core.js.map