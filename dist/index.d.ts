/**
 * metacognitive-memory OpenClaw plugin — L0~L6 six-layer cognitive memory.
 * Uses sql.js WASM SQLite, zero native dependencies, cross-device portable.
 */
import { Type } from "typebox";
import { type OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { MetaCore } from "./core/meta-core.js";
export declare function getOrCreateCore(api: OpenClawPluginApi): MetaCore;
export declare function toolParams<T extends Record<string, unknown>>(schema: T): Type.TObject<Type.TProperties>;
export declare const tools: readonly [readonly ["l0_capture", "Capture raw conversation log", {
    readonly session_id: Type.TString;
    readonly role: Type.TUnion<[Type.TLiteral<"user">, Type.TLiteral<"assistant">, Type.TLiteral<"system">, Type.TLiteral<"tool">]>;
    readonly content: Type.TString;
    readonly tool_name: Type.TOptional<Type.TString>;
    readonly tool_result: Type.TOptional<Type.TString>;
}], readonly ["l0_list", "List raw conversation logs", {
    readonly session_id: Type.TString;
    readonly limit: Type.TOptional<Type.TNumber>;
}], readonly ["l1_extract", "Extract structured memories from raw logs", {
    readonly session_id: Type.TString;
    readonly max_memories: Type.TOptional<Type.TNumber>;
}], readonly ["l1_list", "List extracted memories", {
    readonly session_id: Type.TString;
    readonly memory_type: Type.TOptional<Type.TUnion<[Type.TLiteral<"preference">, Type.TLiteral<"fact">, Type.TLiteral<"decision">, Type.TLiteral<"context">, Type.TLiteral<"instruction">]>>;
    readonly limit: Type.TOptional<Type.TNumber>;
}], readonly ["l2_create_scene", "Create a narrative scene block", {
    readonly session_id: Type.TString;
    readonly scene_type: Type.TUnion<[Type.TLiteral<"project">, Type.TLiteral<"decision">, Type.TLiteral<"interaction">, Type.TLiteral<"error">, Type.TLiteral<"growth">]>;
    readonly title: Type.TString;
    readonly background: Type.TOptional<Type.TString>;
    readonly decision: Type.TOptional<Type.TString>;
    readonly result: Type.TOptional<Type.TString>;
}], readonly ["l2_list_scenes", "List scene blocks", {
    readonly session_id: Type.TString;
    readonly scene_type: Type.TOptional<Type.TUnion<[Type.TLiteral<"project">, Type.TLiteral<"decision">, Type.TLiteral<"interaction">, Type.TLiteral<"error">, Type.TLiteral<"growth">]>>;
    readonly limit: Type.TOptional<Type.TNumber>;
}], readonly ["l3_update_graph", "Update cognitive graph from memories", {
    readonly session_id: Type.TString;
}], readonly ["l3_list_entities", "List knowledge graph entities", {
    readonly session_id: Type.TString;
    readonly entity_type: Type.TOptional<Type.TUnion<[Type.TLiteral<"person">, Type.TLiteral<"project">, Type.TLiteral<"supplier">, Type.TLiteral<"decision">, Type.TLiteral<"event">, Type.TLiteral<"concept">]>>;
    readonly limit: Type.TOptional<Type.TNumber>;
}], readonly ["l3_list_relations", "List knowledge graph relations", {
    readonly session_id: Type.TString;
    readonly from_entity_id: Type.TOptional<Type.TString>;
    readonly limit: Type.TOptional<Type.TNumber>;
}], readonly ["l4_create_goal", "Create a goal in the tracking tree", {
    readonly session_id: Type.TString;
    readonly title: Type.TString;
    readonly description: Type.TOptional<Type.TString>;
    readonly parent_id: Type.TOptional<Type.TString>;
    readonly priority: Type.TOptional<Type.TNumber>;
}], readonly ["l4_tree", "Get full goal tree (recursive)", {
    readonly session_id: Type.TString;
}], readonly ["l4_update_goal", "Update a goal's status/blocker/priority", {
    readonly goal_id: Type.TString;
    readonly session_id: Type.TString;
    readonly status: Type.TOptional<Type.TUnion<[Type.TLiteral<"pending">, Type.TLiteral<"in_progress">, Type.TLiteral<"blocked">, Type.TLiteral<"done">, Type.TLiteral<"cancelled">]>>;
    readonly blocker: Type.TOptional<Type.TString>;
    readonly priority: Type.TOptional<Type.TNumber>;
}], readonly ["l4_delete_goal", "Delete a goal and its subtree", {
    readonly goal_id: Type.TString;
    readonly session_id: Type.TString;
}], readonly ["l5_add_fact", "Add a fact to the knowledge base", {
    readonly session_id: Type.TString;
    readonly domain: Type.TString;
    readonly fact_text: Type.TString;
    readonly confidence: Type.TOptional<Type.TNumber>;
    readonly tags: Type.TOptional<Type.TArray<Type.TString>>;
}], readonly ["l5_search", "Search the knowledge base", {
    readonly session_id: Type.TString;
    readonly query: Type.TString;
    readonly limit: Type.TOptional<Type.TNumber>;
}], readonly ["l5_verify_fact", "Mark a knowledge fact as verified", {
    readonly fact_id: Type.TString;
    readonly session_id: Type.TString;
}], readonly ["l5_list_facts", "List knowledge facts", {
    readonly session_id: Type.TString;
    readonly domain: Type.TOptional<Type.TString>;
    readonly limit: Type.TOptional<Type.TNumber>;
}], readonly ["l5_delete_fact", "Delete a knowledge fact", {
    readonly fact_id: Type.TString;
    readonly session_id: Type.TString;
}], readonly ["l6_log_error", "Log an error to the self-model", {
    readonly session_id: Type.TString;
    readonly error_type: Type.TUnion<[Type.TLiteral<"sql_error">, Type.TLiteral<"config_error">, Type.TLiteral<"logic_error">, Type.TLiteral<"tool_error">, Type.TLiteral<"recall_error">]>;
    readonly summary: Type.TString;
    readonly detail: Type.TOptional<Type.TString>;
    readonly stack_trace: Type.TOptional<Type.TString>;
}], readonly ["l6_self_check", "Run self-diagnostic and return error/capability summary", {
    readonly session_id: Type.TString;
}]];
type ToolName = typeof tools[number][0];
export declare function buildExecuteHandler(api: OpenClawPluginApi): (name: ToolName, params: Record<string, unknown>) => string | import("./core/types.js").L0Row[] | import("./core/types.js").L1Row[] | import("./core/types.js").L2Row[] | import("./core/types.js").KGEntityRow[] | import("./core/types.js").KGRelationRow[] | Record<string, unknown>[] | import("./core/types.js").KnowledgeFactRow[] | {
    entitiesCreated: number;
} | {
    errorStats: Record<string, number>;
    capCategories: Record<string, number>;
    recentErrors: import("./core/types.js").ErrorLogRow[];
} | {
    extracted: number;
    scene_id?: undefined;
    goal_id?: undefined;
    updated?: undefined;
    deleted?: undefined;
    fact_id?: undefined;
    verified?: undefined;
    error_id?: undefined;
    error?: undefined;
} | {
    scene_id: string;
    extracted?: undefined;
    goal_id?: undefined;
    updated?: undefined;
    deleted?: undefined;
    fact_id?: undefined;
    verified?: undefined;
    error_id?: undefined;
    error?: undefined;
} | {
    goal_id: string;
    extracted?: undefined;
    scene_id?: undefined;
    updated?: undefined;
    deleted?: undefined;
    fact_id?: undefined;
    verified?: undefined;
    error_id?: undefined;
    error?: undefined;
} | {
    updated: boolean;
    extracted?: undefined;
    scene_id?: undefined;
    goal_id?: undefined;
    deleted?: undefined;
    fact_id?: undefined;
    verified?: undefined;
    error_id?: undefined;
    error?: undefined;
} | {
    deleted: boolean;
    extracted?: undefined;
    scene_id?: undefined;
    goal_id?: undefined;
    updated?: undefined;
    fact_id?: undefined;
    verified?: undefined;
    error_id?: undefined;
    error?: undefined;
} | {
    fact_id: string;
    extracted?: undefined;
    scene_id?: undefined;
    goal_id?: undefined;
    updated?: undefined;
    deleted?: undefined;
    verified?: undefined;
    error_id?: undefined;
    error?: undefined;
} | {
    verified: boolean;
    extracted?: undefined;
    scene_id?: undefined;
    goal_id?: undefined;
    updated?: undefined;
    deleted?: undefined;
    fact_id?: undefined;
    error_id?: undefined;
    error?: undefined;
} | {
    error_id: string;
    extracted?: undefined;
    scene_id?: undefined;
    goal_id?: undefined;
    updated?: undefined;
    deleted?: undefined;
    fact_id?: undefined;
    verified?: undefined;
    error?: undefined;
} | {
    error: string;
    extracted?: undefined;
    scene_id?: undefined;
    goal_id?: undefined;
    updated?: undefined;
    deleted?: undefined;
    fact_id?: undefined;
    verified?: undefined;
    error_id?: undefined;
};
declare const _default: {
    id: string;
    name: string;
    description: string;
    register(api: OpenClawPluginApi): void;
};
export default _default;
//# sourceMappingURL=index.d.ts.map