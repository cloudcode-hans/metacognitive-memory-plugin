/**
 * Native SQLite store with sqlite-vec vector support.
 * All tables scoped by session_id for multi-agent isolation.
 */
import { L0Row, L1Row, L2Row, KGEntityRow, KGRelationRow, KnowledgeFactRow, ErrorLogRow, MemoryType, SceneType, EntityType, GoalStatus, ErrorType } from "./types.js";
export declare class MemoryStore {
    private db;
    private dbPath;
    private initPromise;
    private vecEnabled;
    constructor(dbPath: string);
    initialize(): Promise<void>;
    private _init;
    close(): Promise<void>;
    private dictRow;
    private listRows;
    private execute;
    private storeEmbedding;
    vectorSearch(p: {
        sessionId: string;
        queryEmbedding: number[];
        sourceType?: string;
        limit?: number;
    }): {
        sourceId: string;
        sourceType: string;
        distance: number;
    }[];
    l0Capture(p: {
        sessionId: string;
        role: string;
        content: string;
        toolName?: string;
        toolResult?: string;
    }): string;
    l0List(sessionId: string, limit?: number): L0Row[];
    l0ListAll(limit?: number): L0Row[];
    l1ListAll(limit?: number): L1Row[];
    private classifyContent;
    private dedupHash;
    l1Extract(sessionId: string, maxMemories?: number): number;
    l1List(sessionId: string, memoryType?: MemoryType, limit?: number): L1Row[];
    l1AddEmbedding(p: {
        memoryId: string;
        sessionId: string;
        embedding: number[];
    }): void;
    l2CreateScene(p: {
        sessionId: string;
        sceneType: SceneType;
        title: string;
        background?: string;
        decision?: string;
        result?: string;
    }): string;
    l2ListScenes(sessionId: string, sceneType?: SceneType, limit?: number): L2Row[];
    private static readonly ZH_STOPWORDS;
    private static readonly MEANINGFUL_CHARS;
    private extractEntityName;
    l3UpdateGraph(sessionId: string): {
        entitiesCreated: number;
    };
    l3ListEntities(sessionId: string, entityType?: EntityType, limit?: number): KGEntityRow[];
    l3ListRelations(sessionId: string, fromEntityId?: string, limit?: number): KGRelationRow[];
    l3AddEntityEmbedding(p: {
        entityId: string;
        sessionId: string;
        embedding: number[];
    }): void;
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
        embedding?: number[];
    }): string;
    l5Search(sessionId: string, query: string, limit?: number): KnowledgeFactRow[];
    l5VectorSearch(p: {
        sessionId: string;
        queryEmbedding: number[];
        limit?: number;
    }): {
        factId: string;
        factText: string;
        distance: number;
        confidence: number;
    }[];
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
        score: number;
        errorStats: Record<string, number>;
        capCategories: Record<string, number>;
        recentErrors: ErrorLogRow[];
        totalErrors: number;
        totalSelfModelEntries: number;
        verifiedCount: number;
    };
    purgeOldByAge(days: number, sessionId?: string): {
        totalDeleted: number;
        days: number;
        sessionId: string | null;
    };
    purgeByFrequency(minFrequency: number, maxDays: number, sessionId?: string): {
        totalDeleted: number;
        minFrequency: number;
        maxDays: number;
        sessionId: string | null;
    };
    smartPurge(config?: {
        defaultRetentionDays?: number;
        highFreqRetentionDays?: number;
        mediumFreqRetentionDays?: number;
        lowFreqRetentionDays?: number;
        highFreqThreshold?: number;
        mediumFreqThreshold?: number;
        sessionId?: string;
    }): {
        totalDeleted: number;
        config: {
            defaultRetentionDays: number;
            highFreqRetentionDays: number;
            mediumFreqRetentionDays: number;
            lowFreqRetentionDays: number;
            highFreqThreshold: number;
            mediumFreqThreshold: number;
        };
    };
    getStorageStats(): {
        stats: Record<string, number>;
        totalRows: number;
        vectorEnabled: boolean;
    };
    getVersion(): string;
    setVersion(version: string): void;
    l1SetSessionState(p: {
        sessionId: string;
        stateKey: string;
        stateValue: unknown;
        stateType?: string;
        ttlSeconds?: number;
        checkpointPos?: number;
    }): string;
    l1GetSessionState(sessionId: string, stateKey: string): unknown | null;
    l1DeleteSessionState(sessionId: string, stateKey: string): void;
    l1ListSessionStates(sessionId: string): Array<{
        key: string;
        value: unknown;
        updatedAt: string;
    }>;
    l1AcquireLock(p: {
        sessionId: string;
        lockKey: string;
        timeoutSeconds?: number;
    }): boolean;
    l1ReleaseLock(sessionId: string, lockKey: string): void;
    l3FtsSearch(p: {
        sessionId: string;
        query: string;
        limit?: number;
    }): Array<{
        sourceId: string;
        sourceType: string;
        score: number;
        content: string;
    }>;
    l3HybridSearch(p: {
        sessionId: string;
        query: string;
        queryEmbedding?: number[];
        limit?: number;
        rrfK?: number;
    }): Array<{
        sourceId: string;
        sourceType: string;
        score: number;
        content: string;
    }>;
    l3IndexSemanticContent(p: {
        sessionId: string;
        sourceType: string;
        sourceId: string;
        memoryText?: string;
        entityName?: string;
        factText?: string;
        embedding?: number[];
    }): void;
    fileIndexCreate(p: {
        sessionId: string;
        layer: string;
        filePath: string;
        fileType: string;
        title?: string;
        summary?: string;
        tags?: string[];
        embedding?: number[];
        version?: string;
    }): string;
    fileIndexUpdate(p: {
        id: string;
        sessionId: string;
        title?: string;
        summary?: string;
        tags?: string[];
        embedding?: number[];
        version?: string;
    }): void;
    fileIndexList(p: {
        sessionId: string;
        layer?: string;
        limit?: number;
    }): Array<{
        id: string;
        layer: string;
        filePath: string;
        fileType: string;
        title: string;
        summary: string;
        tags: string[];
        version: string;
        updatedAt: string;
    }>;
    fileIndexDelete(id: string, sessionId: string): void;
    fileIndexSearch(p: {
        sessionId: string;
        query: string;
        layer?: string;
        limit?: number;
    }): Array<{
        id: string;
        layer: string;
        filePath: string;
        title: string;
        summary: string;
    }>;
}
//# sourceMappingURL=store.d.ts.map