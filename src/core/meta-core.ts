/**
 * meta-core.ts — Business logic facade for metacognitive memory.
 * Provides async initialization around MemoryStore with vector support.
 */

import { join } from "node:path";
import type {
  L0Row,
  L1Row,
  L2Row,
  KGEntityRow,
  KGRelationRow,
  GoalRow,
  KnowledgeFactRow,
  ErrorLogRow,
  SceneType,
  EntityType,
  MemoryType,
  GoalStatus,
  ErrorType,
} from "./types.js";
import { MemoryStore } from "./store.js";

export interface MetaCoreConfig {
  stateDir: string;
}

export class MetaCore {
  private store: MemoryStore;
  private ready: Promise<void>;

  constructor(cfg: MetaCoreConfig) {
    const dbPath = join(cfg.stateDir, "metacognitive_memory", "memory.db");
    this.store = new MemoryStore(dbPath);
    this.ready = this.store.initialize();
  }

  async initialize(): Promise<void> {
    await this.ready;
  }

  // ─── L0 ────────────────────────────────────────────────────────────────────

  l0Capture(p: {
    sessionId: string;
    role: string;
    content: string;
    channelId?: string;
    toolName?: string;
    toolResult?: string;
  }): string {
    return this.store.l0Capture(p);
  }

  l0List(sessionId: string, limit = 50): L0Row[] {
    return this.store.l0List(sessionId, limit);
  }

  l0ListAll(limit = 50): L0Row[] {
    return this.store.l0ListAll(limit);
  }

  // ─── L1 ────────────────────────────────────────────────────────────────────

  l1Extract(sessionId: string, maxMemories = 30): number {
    return this.store.l1Extract(sessionId, maxMemories);
  }

  l1List(sessionId: string, memoryType?: MemoryType, limit = 50): L1Row[] {
    return this.store.l1List(sessionId, memoryType, limit);
  }

  l1ListAll(limit = 50): L1Row[] {
    return this.store.l1ListAll(limit);
  }

  l1AddEmbedding(p: {
    memoryId: string;
    sessionId: string;
    embedding: number[];
  }): void {
    return this.store.l1AddEmbedding(p);
  }

  // L1 Session State Management
  l1SetSessionState(p: {
    sessionId: string;
    stateKey: string;
    stateValue: unknown;
    stateType?: string;
    ttlSeconds?: number;
    checkpointPos?: number;
  }): string {
    return this.store.l1SetSessionState(p);
  }

  l1GetSessionState(sessionId: string, stateKey: string): unknown | null {
    return this.store.l1GetSessionState(sessionId, stateKey);
  }

  l1DeleteSessionState(sessionId: string, stateKey: string): void {
    return this.store.l1DeleteSessionState(sessionId, stateKey);
  }

  l1ListSessionStates(sessionId: string): Array<{ key: string; value: unknown; updatedAt: string }> {
    return this.store.l1ListSessionStates(sessionId);
  }

  l1AcquireLock(p: { sessionId: string; lockKey: string; timeoutSeconds?: number }): boolean {
    return this.store.l1AcquireLock(p);
  }

  l1ReleaseLock(sessionId: string, lockKey: string): void {
    return this.store.l1ReleaseLock(sessionId, lockKey);
  }

  // ─── L2 ────────────────────────────────────────────────────────────────────

  l2CreateScene(p: {
    sessionId: string;
    sceneType: SceneType;
    title: string;
    background?: string;
    decision?: string;
    result?: string;
  }): string {
    return this.store.l2CreateScene(p);
  }

  l2ListScenes(sessionId: string, sceneType?: SceneType, limit = 50): L2Row[] {
    return this.store.l2ListScenes(sessionId, sceneType, limit);
  }

  // ─── L3 ────────────────────────────────────────────────────────────────────

  l3UpdateGraph(sessionId: string): { entitiesCreated: number } {
    return this.store.l3UpdateGraph(sessionId);
  }

  l3ListEntities(sessionId: string, entityType?: EntityType, limit = 50): KGEntityRow[] {
    return this.store.l3ListEntities(sessionId, entityType, limit);
  }

  l3ListRelations(sessionId: string, fromEntityId?: string, limit = 50): KGRelationRow[] {
    return this.store.l3ListRelations(sessionId, fromEntityId, limit);
  }

  l3AddEntityEmbedding(p: {
    entityId: string;
    sessionId: string;
    embedding: number[];
  }): void {
    return this.store.l3AddEntityEmbedding(p);
  }

  // L3 Hybrid Search (BM25 + Vector RRF)
  l3FtsSearch(p: {
    sessionId: string;
    query: string;
    limit?: number;
  }): Array<{ sourceId: string; sourceType: string; score: number; content: string }> {
    return this.store.l3FtsSearch(p);
  }

  l3HybridSearch(p: {
    sessionId: string;
    query: string;
    queryEmbedding?: number[];
    limit?: number;
    rrfK?: number;
  }): Array<{ sourceId: string; sourceType: string; score: number; content: string }> {
    return this.store.l3HybridSearch(p);
  }

  l3IndexSemanticContent(p: {
    sessionId: string;
    sourceType: string;
    sourceId: string;
    memoryText?: string;
    entityName?: string;
    factText?: string;
    embedding?: number[];
  }): void {
    return this.store.l3IndexSemanticContent(p);
  }

  // ─── L4 ────────────────────────────────────────────────────────────────────

  l4CreateGoal(p: {
    sessionId: string;
    title: string;
    description?: string;
    parentId?: string;
    priority?: number;
  }): string {
    return this.store.l4CreateGoal(p);
  }

  l4Tree(sessionId: string): Record<string, unknown>[] {
    return this.store.l4Tree(sessionId);
  }

  l4UpdateGoal(p: { goalId: string; sessionId: string; status?: GoalStatus; blocker?: string; priority?: number }): void {
    return this.store.l4UpdateGoal(p);
  }

  l4DeleteGoal(goalId: string, sessionId: string): void {
    return this.store.l4DeleteGoal(goalId, sessionId);
  }

  // ─── L5 ────────────────────────────────────────────────────────────────────

  l5AddFact(p: {
    sessionId: string;
    domain: string;
    factText: string;
    confidence?: number;
    tags?: string[];
    embedding?: number[];
  }): string {
    return this.store.l5AddFact(p);
  }

  l5Search(sessionId: string, query: string, limit = 20): KnowledgeFactRow[] {
    return this.store.l5Search(sessionId, query, limit);
  }

  l5VectorSearch(p: {
    sessionId: string;
    queryEmbedding: number[];
    limit?: number;
  }): { factId: string; factText: string; distance: number; confidence: number }[] {
    return this.store.l5VectorSearch(p);
  }

  l5VerifyFact(factId: string, sessionId: string): void {
    return this.store.l5VerifyFact(factId, sessionId);
  }

  l5ListFacts(sessionId: string, domain?: string, limit = 50): KnowledgeFactRow[] {
    return this.store.l5ListFacts(sessionId, domain, limit);
  }

  l5DeleteFact(factId: string, sessionId: string): void {
    return this.store.l5DeleteFact(factId, sessionId);
  }

  // ─── L6 ────────────────────────────────────────────────────────────────────

  l6LogError(p: {
    sessionId: string;
    errorType: ErrorType;
    summary: string;
    detail?: string;
    stackTrace?: string;
    context?: Record<string, unknown>;
  }): string {
    return this.store.l6LogError(p);
  }

  l6SelfCheck(sessionId: string): {
    score: number;
    errorStats: Record<string, number>;
    capCategories: Record<string, number>;
    recentErrors: ErrorLogRow[];
    totalErrors: number;
    totalSelfModelEntries: number;
    verifiedCount: number;
  } {
    return this.store.l6SelfCheck(sessionId);
  }

  // ─── Data Purge & Maintenance ────────────────────────────────────────────────

  purgeOldByAge(days: number, sessionId?: string): { totalDeleted: number; days: number; sessionId: string | null } {
    return this.store.purgeOldByAge(days, sessionId);
  }

  purgeByFrequency(minFrequency: number, maxDays: number, sessionId?: string): { totalDeleted: number; minFrequency: number; maxDays: number; sessionId: string | null } {
    return this.store.purgeByFrequency(minFrequency, maxDays, sessionId);
  }

  smartPurge(config: {
    defaultRetentionDays?: number;
    highFreqRetentionDays?: number;
    mediumFreqRetentionDays?: number;
    lowFreqRetentionDays?: number;
    highFreqThreshold?: number;
    mediumFreqThreshold?: number;
    sessionId?: string;
  } = {}): {
    totalDeleted: number;
    config: {
      defaultRetentionDays: number;
      highFreqRetentionDays: number;
      mediumFreqRetentionDays: number;
      lowFreqRetentionDays: number;
      highFreqThreshold: number;
      mediumFreqThreshold: number;
    };
  } {
    return this.store.smartPurge(config);
  }

  getStorageStats(): { stats: Record<string, number>; totalRows: number; vectorEnabled: boolean } {
    return this.store.getStorageStats();
  }

  // ─── File-based Storage Index (L4/L5/L6) ────────────────────────────────────

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
  }): string {
    return this.store.fileIndexCreate(p);
  }

  fileIndexUpdate(p: {
    id: string;
    sessionId: string;
    title?: string;
    summary?: string;
    tags?: string[];
    embedding?: number[];
    version?: string;
  }): void {
    return this.store.fileIndexUpdate(p);
  }

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
  }> {
    return this.store.fileIndexList(p);
  }

  fileIndexDelete(id: string, sessionId: string): void {
    return this.store.fileIndexDelete(id, sessionId);
  }

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
  }> {
    return this.store.fileIndexSearch(p);
  }

  async close(): Promise<void> {
    await this.store.close();
  }
}
