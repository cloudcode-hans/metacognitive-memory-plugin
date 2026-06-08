/**
 * Shared type definitions for metacognitive-memory L0~L6
 */
export interface L0Row {
    id: string;
    session_id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tool_name?: string;
    tool_result?: string;
    timestamp: string;
    created_at: string;
}
export type MemoryType = "preference" | "fact" | "decision" | "context" | "instruction";
export interface L1Row {
    id: string;
    session_id: string;
    memory_text: string;
    memory_type: MemoryType;
    importance: number;
    embedding_id?: string;
    source_ids: string;
    dedup_hash: string;
    verified: number;
    created_at: string;
    updated_at: string;
}
export type SceneType = "project" | "decision" | "interaction" | "error" | "growth";
export interface L2Row {
    id: string;
    session_id: string;
    scene_type: SceneType;
    title: string;
    background?: string;
    decision?: string;
    result?: string;
    actors?: string;
    key_memories?: string;
    importance: number;
    created_at: string;
}
export type EntityType = "person" | "project" | "supplier" | "decision" | "event" | "concept";
export interface KGEntityRow {
    id: string;
    session_id: string;
    entity_type: EntityType;
    name: string;
    attrs?: string;
    importance: number;
    embedding_id?: string;
    frequency: number;
    last_seen?: string;
    created_at: string;
}
export interface KGRelationRow {
    id: string;
    session_id: string;
    from_entity_id: string;
    to_entity_id: string;
    rel_type: string;
    weight: number;
    context?: string;
    bidirectional: number;
    created_at: string;
}
export type GoalStatus = "pending" | "in_progress" | "blocked" | "done" | "cancelled";
export interface GoalRow {
    id: string;
    session_id: string;
    parent_id?: string;
    title: string;
    description?: string;
    status: GoalStatus;
    blocker?: string;
    priority: number;
    due_date?: string;
    created_at: string;
    updated_at: string;
}
export interface KnowledgeFactRow {
    id: string;
    session_id: string;
    domain: string;
    fact_text: string;
    source_scene_id?: string;
    source_memory_id?: string;
    confidence: number;
    verified: number;
    verifier?: string;
    verified_at?: string;
    tags?: string;
    created_at: string;
}
export type ErrorType = "sql_error" | "config_error" | "logic_error" | "tool_error" | "recall_error";
export type SelfModelCategory = "capability" | "boundary" | "error_pattern" | "growth" | "value";
export interface ErrorLogRow {
    id: string;
    session_id: string;
    error_type: ErrorType;
    summary: string;
    detail?: string;
    stack_trace?: string;
    context?: string;
    resolved: number;
    resolved_at?: string;
    resolution?: string;
    created_at: string;
}
export interface SelfModelRow {
    id: string;
    session_id: string;
    category: SelfModelCategory;
    content: string;
    confidence: number;
    evidence_count: number;
    verified: number;
    last_verified_at?: string;
    created_at: string;
    updated_at: string;
}
export interface CaptureParams {
    session_id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tool_name?: string;
    tool_result?: string;
}
export interface L1ExtractParams {
    session_id: string;
    max_memories?: number;
}
export interface L2CreateSceneParams {
    session_id: string;
    scene_type: SceneType;
    title: string;
    background?: string;
    decision?: string;
    result?: string;
}
export interface L3ListEntitiesParams {
    session_id: string;
    entity_type?: EntityType;
    limit?: number;
}
export interface L3ListRelationsParams {
    session_id: string;
    from_entity_id?: string;
    limit?: number;
}
export interface L4CreateGoalParams {
    session_id: string;
    title: string;
    description?: string;
    parent_id?: string;
    priority?: number;
}
export interface L4UpdateGoalParams {
    goal_id: string;
    status?: GoalStatus;
    blocker?: string;
    priority?: number;
}
export interface L5AddFactParams {
    session_id: string;
    domain: string;
    fact_text: string;
    confidence?: number;
    tags?: string[];
}
export interface L5SearchParams {
    session_id: string;
    query: string;
    limit?: number;
}
export interface L5ListFactsParams {
    session_id: string;
    domain?: string;
    limit?: number;
}
export interface L6LogErrorParams {
    session_id: string;
    error_type: ErrorType;
    summary: string;
    detail?: string;
    stack_trace?: string;
}
//# sourceMappingURL=types.d.ts.map