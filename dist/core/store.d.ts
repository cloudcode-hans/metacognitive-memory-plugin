/**
 * sql.js (WASM SQLite) store with debounced auto-save.
 * All tables scoped by session_id for multi-agent isolation.
 */
import { L0Row, L1Row, L2Row, KGEntityRow, KGRelationRow, KnowledgeFactRow, ErrorLogRow, MemoryType, SceneType, EntityType, GoalStatus, ErrorType } from "./types.js";
export declare class MemoryStore {
    private db;
    private dbPath;
    private saveTimer;
    private savePending;
    private initPromise;
    constructor(dbPath: string);
    initialize(): Promise<void>;
    private _init;
    private scheduleSave;
    private _persistSync;
    close(): Promise<void>;
    private dictRow;
    private listRows;
    private execute;
    l0Capture(p: {
        sessionId: string;
        role: string;
        content: string;
        toolName?: string;
        toolResult?: string;
    }): string;
    l0List(sessionId: string, limit?: number): L0Row[];
    private classifyContent;
    private dedupHash;
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
        status?: GoalStatus;
        blocker?: string;
        priority?: number;
    }): void;
    l4DeleteGoal(goalId: string): void;
    l5AddFact(p: {
        sessionId: string;
        domain: string;
        factText: string;
        confidence?: number;
        tags?: string[];
    }): string;
    l5Search(sessionId: string, query: string, limit?: number): KnowledgeFactRow[];
    l5VerifyFact(factId: string): void;
    l5ListFacts(sessionId: string, domain?: string, limit?: number): KnowledgeFactRow[];
    l5DeleteFact(factId: string): void;
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
}
//# sourceMappingURL=store.d.ts.map