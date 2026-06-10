/**
 * meta-core.ts — Business logic facade for metacognitive memory.
 * Provides async initialization around MemoryStore.
 */
import type { L0Row, L1Row, L2Row, KGEntityRow, KGRelationRow, KnowledgeFactRow, ErrorLogRow, SceneType, EntityType, MemoryType, GoalStatus, ErrorType } from "./types.js";
export interface MetaCoreConfig {
    stateDir: string;
}
export declare class MetaCore {
    private store;
    private ready;
    constructor(cfg: MetaCoreConfig);
    initialize(): Promise<void>;
    l0Capture(p: {
        sessionId: string;
        role: string;
        content: string;
        channelId?: string;
        toolName?: string;
        toolResult?: string;
    }): string;
    l0List(sessionId: string, limit?: number): L0Row[];
    l1Extract(sessionId: string, maxMemories?: number): number;
    l1List(sessionId: string, memoryType?: MemoryType, limit?: number): L1Row[];
    l2CreateScene(p: {
        sessionId: string;
        sceneType: SceneType;
        title: string;
        background?: string;
        decision?: string;
        result?: string;
    }): string;
    l2ListScenes(sessionId: string, sceneType?: SceneType, limit?: number): L2Row[];
    l3UpdateGraph(sessionId: string): {
        entitiesCreated: number;
    };
    l3ListEntities(sessionId: string, entityType?: EntityType, limit?: number): KGEntityRow[];
    l3ListRelations(sessionId: string, fromEntityId?: string, limit?: number): KGRelationRow[];
    l4CreateGoal(p: {
        sessionId: string;
        title: string;
        description?: string;
        parentId?: string;
        priority?: number;
    }): string;
    l4Tree(sessionId: string): Record<string, unknown>[];
    l4UpdateGoal(p: {
        goalId: string;
        sessionId: string;
        status?: GoalStatus;
        blocker?: string;
        priority?: number;
    }): void;
    l4DeleteGoal(goalId: string, sessionId: string): void;
    l5AddFact(p: {
        sessionId: string;
        domain: string;
        factText: string;
        confidence?: number;
        tags?: string[];
    }): string;
    l5Search(sessionId: string, query: string, limit?: number): KnowledgeFactRow[];
    l5VerifyFact(factId: string, sessionId: string): void;
    l5ListFacts(sessionId: string, domain?: string, limit?: number): KnowledgeFactRow[];
    l5DeleteFact(factId: string, sessionId: string): void;
    l6LogError(p: {
        sessionId: string;
        errorType: ErrorType;
        summary: string;
        detail?: string;
        stackTrace?: string;
        context?: Record<string, unknown>;
    }): string;
    l6SelfCheck(sessionId: string): {
        errorStats: Record<string, number>;
        capCategories: Record<string, number>;
        recentErrors: ErrorLogRow[];
    };
    close(): Promise<void>;
}
//# sourceMappingURL=meta-core.d.ts.map