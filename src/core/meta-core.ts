/**
 * meta-core.ts — Business logic facade for metacognitive memory.
 * Provides async initialization around MemoryStore.
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
<<<<<<< HEAD
    const dbPath = join(cfg.stateDir, ".metacognitive_memory", "memory.db");
=======
    const dbPath = join(cfg.stateDir, "memory.db");
>>>>>>> 2898562 (Security audit fixes: session isolation, opt-in capture, data redaction, privacy warnings)
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

  // ─── L1 ────────────────────────────────────────────────────────────────────

  l1Extract(sessionId: string, maxMemories = 30): number {
    return this.store.l1Extract(sessionId, maxMemories);
  }

  l1List(sessionId: string, memoryType?: MemoryType, limit = 50): L1Row[] {
    return this.store.l1List(sessionId, memoryType, limit);
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

<<<<<<< HEAD
  l4UpdateGoal(p: { goalId: string; status?: GoalStatus; blocker?: string; priority?: number }): void {
    return this.store.l4UpdateGoal(p);
  }

  l4DeleteGoal(goalId: string): void {
    return this.store.l4DeleteGoal(goalId);
=======
  l4UpdateGoal(p: { goalId: string; sessionId: string; status?: GoalStatus; blocker?: string; priority?: number }): void {
    return this.store.l4UpdateGoal(p);
  }

  l4DeleteGoal(goalId: string, sessionId: string): void {
    return this.store.l4DeleteGoal(goalId, sessionId);
>>>>>>> 2898562 (Security audit fixes: session isolation, opt-in capture, data redaction, privacy warnings)
  }

  // ─── L5 ────────────────────────────────────────────────────────────────────

  l5AddFact(p: {
    sessionId: string;
    domain: string;
    factText: string;
    confidence?: number;
    tags?: string[];
  }): string {
    return this.store.l5AddFact(p);
  }

  l5Search(sessionId: string, query: string, limit = 20): KnowledgeFactRow[] {
    return this.store.l5Search(sessionId, query, limit);
  }

<<<<<<< HEAD
  l5VerifyFact(factId: string): void {
    return this.store.l5VerifyFact(factId);
=======
  l5VerifyFact(factId: string, sessionId: string): void {
    return this.store.l5VerifyFact(factId, sessionId);
>>>>>>> 2898562 (Security audit fixes: session isolation, opt-in capture, data redaction, privacy warnings)
  }

  l5ListFacts(sessionId: string, domain?: string, limit = 50): KnowledgeFactRow[] {
    return this.store.l5ListFacts(sessionId, domain, limit);
  }

<<<<<<< HEAD
  l5DeleteFact(factId: string): void {
    return this.store.l5DeleteFact(factId);
=======
  l5DeleteFact(factId: string, sessionId: string): void {
    return this.store.l5DeleteFact(factId, sessionId);
>>>>>>> 2898562 (Security audit fixes: session isolation, opt-in capture, data redaction, privacy warnings)
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
    errorStats: Record<string, number>;
    capCategories: Record<string, number>;
    recentErrors: ErrorLogRow[];
  } {
    return this.store.l6SelfCheck(sessionId);
  }

  async close(): Promise<void> {
    await this.store.close();
  }
}