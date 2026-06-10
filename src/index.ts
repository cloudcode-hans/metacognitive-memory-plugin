/**
 * metacognitive-memory OpenClaw plugin — L0~L6 six-layer cognitive memory.
 * Uses sql.js WASM SQLite, zero native dependencies, cross-device portable.
 */

import { join } from "node:path";
import { Type } from "typebox";
import { definePluginEntry, jsonResult, type OpenClawPluginApi, type AnyAgentTool } from "openclaw/plugin-sdk/core";
import { MetaCore } from "./core/meta-core.js";
import { OpenClawHostAdapter } from "./adapters/openclaw/host-adapter.js";
import type {
  SceneType,
  EntityType,
  MemoryType,
  GoalStatus,
  ErrorType,
} from "./core/types.js";

// Singleton core instance (per plugin process)
let core: MetaCore | null = null;
let coreReady: Promise<void> | null = null;

export function getOrCreateCore(api: OpenClawPluginApi): MetaCore {
  if (core) return core;

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

export function toolParams<T extends Record<string, unknown>>(schema: T) {
  return Type.Object(schema as unknown as Parameters<typeof Type.Object>[0]);
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
  }] as const,

  ["l0_list", "List raw conversation logs", {
    session_id: Type.String(),
    limit: Type.Optional(Type.Number({ default: 50 })),
  }] as const,

  // ── L1 ───────────────────────────────────────────────────────────────────────
  ["l1_extract", "Extract structured memories from raw logs", {
    session_id: Type.String(),
    max_memories: Type.Optional(Type.Number({ default: 30 })),
  }] as const,

  ["l1_list", "List extracted memories", {
    session_id: Type.String(),
    memory_type: Type.Optional(MemoryTypeEnum),
    limit: Type.Optional(Type.Number({ default: 50 })),
  }] as const,

  // ── L2 ───────────────────────────────────────────────────────────────────────
  ["l2_create_scene", "Create a narrative scene block", {
    session_id: Type.String(),
    scene_type: SceneTypeEnum,
    title: Type.String(),
    background: Type.Optional(Type.String()),
    decision: Type.Optional(Type.String()),
    result: Type.Optional(Type.String()),
  }] as const,

  ["l2_list_scenes", "List scene blocks", {
    session_id: Type.String(),
    scene_type: Type.Optional(SceneTypeEnum),
    limit: Type.Optional(Type.Number({ default: 50 })),
  }] as const,

  // ── L3 ────────────────────────────────────────────────────────────────────
  ["l3_update_graph", "Update cognitive graph from memories", {
    session_id: Type.String(),
  }] as const,

  ["l3_list_entities", "List knowledge graph entities", {
    session_id: Type.String(),
    entity_type: Type.Optional(EntityTypeEnum),
    limit: Type.Optional(Type.Number({ default: 50 })),
  }] as const,

  ["l3_list_relations", "List knowledge graph relations", {
    session_id: Type.String(),
    from_entity_id: Type.Optional(Type.String()),
    limit: Type.Optional(Type.Number({ default: 50 })),
  }] as const,

  // ── L4 ─────────────────────────────────────────────────────────────────────
  ["l4_create_goal", "Create a goal in the tracking tree", {
    session_id: Type.String(),
    title: Type.String(),
    description: Type.Optional(Type.String()),
    parent_id: Type.Optional(Type.String()),
    priority: Type.Optional(Type.Number({ default: 2 })),
  }] as const,

  ["l4_tree", "Get full goal tree (recursive)", {
    session_id: Type.String(),
  }] as const,

  ["l4_update_goal", "Update a goal's status/blocker/priority", {
    goal_id: Type.String(),
    session_id: Type.String(),
    status: Type.Optional(GoalStatusEnum),
    blocker: Type.Optional(Type.String()),
    priority: Type.Optional(Type.Number()),
  }] as const,

  ["l4_delete_goal", "Delete a goal and its subtree", {
    goal_id: Type.String(),
    session_id: Type.String(),
  }] as const,

  // ── L5 ────────────────────────────────────────────────────────────────────────────
  ["l5_add_fact", "Add a fact to the knowledge base", {
    session_id: Type.String(),
    domain: Type.String(),
    fact_text: Type.String(),
    confidence: Type.Optional(Type.Number({ default: 0.8 })),
    tags: Type.Optional(Type.Array(Type.String())),
  }] as const,

  ["l5_search", "Search the knowledge base", {
    session_id: Type.String(),
    query: Type.String(),
    limit: Type.Optional(Type.Number({ default: 20 })),
  }] as const,

  ["l5_verify_fact", "Mark a knowledge fact as verified", {
    fact_id: Type.String(),
    session_id: Type.String(),
  }] as const,

  ["l5_list_facts", "List knowledge facts", {
    session_id: Type.String(),
    domain: Type.Optional(Type.String()),
    limit: Type.Optional(Type.Number({ default: 50 })),
  }] as const,

  ["l5_delete_fact", "Delete a knowledge fact", {
    fact_id: Type.String(),
    session_id: Type.String(),
  }] as const,

  // ── L6 ─────────────────────────────────────────────────────────────────────
  ["l6_log_error", "Log an error to the self-model", {
    session_id: Type.String(),
    error_type: ErrorTypeEnum,
    summary: Type.String(),
    detail: Type.Optional(Type.String()),
    stack_trace: Type.Optional(Type.String()),
  }] as const,

  ["l6_self_check", "Run self-diagnostic and return error/capability summary", {
    session_id: Type.String(),
  }] as const,
] as const;

// ─── Tool name → execute handler map ─────────────────────────────────────────────

type ToolName = typeof tools[number][0];

export function buildExecuteHandler(api: OpenClawPluginApi) {
  return function handleTool(name: ToolName, params: Record<string, unknown>) {
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
        return m.l0List(
          String(params.session_id),
          params.limit ? Number(params.limit) : 50
        );

      // L1
      case "l1_extract":
        return { extracted: m.l1Extract(
          String(params.session_id),
          params.max_memories ? Number(params.max_memories) : 30
        ) };

      case "l1_list":
        return m.l1List(
          String(params.session_id),
          params.memory_type ? String(params.memory_type) as MemoryType : undefined,
          params.limit ? Number(params.limit) : 50
        );

      // L2
      case "l2_create_scene":
        return { scene_id: m.l2CreateScene({
          sessionId: String(params.session_id),
          sceneType: String(params.scene_type) as SceneType,
          title: String(params.title),
          background: params.background ? String(params.background) : undefined,
          decision: params.decision ? String(params.decision) : undefined,
          result: params.result ? String(params.result) : undefined,
        }) };

      case "l2_list_scenes":
        return m.l2ListScenes(
          String(params.session_id),
          params.scene_type ? String(params.scene_type) as SceneType : undefined,
          params.limit ? Number(params.limit) : 50
        );

      // L3
      case "l3_update_graph":
        return m.l3UpdateGraph(String(params.session_id));

      case "l3_list_entities":
        return m.l3ListEntities(
          String(params.session_id),
          params.entity_type ? String(params.entity_type) as EntityType : undefined,
          params.limit ? Number(params.limit) : 50
        );

      case "l3_list_relations":
        return m.l3ListRelations(
          String(params.session_id),
          params.from_entity_id ? String(params.from_entity_id) : undefined,
          params.limit ? Number(params.limit) : 50
        );

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
          status: params.status ? String(params.status) as GoalStatus : undefined,
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
          tags: params.tags ? (params.tags as string[]).map(String) : undefined,
        }) };

      case "l5_search":
        return m.l5Search(
          String(params.session_id),
          String(params.query),
          params.limit ? Number(params.limit) : 20
        );

      case "l5_verify_fact":
        m.l5VerifyFact(String(params.fact_id), String(params.session_id));
        return { verified: true };

      case "l5_list_facts":
        return m.l5ListFacts(
          String(params.session_id),
          params.domain ? String(params.domain) : undefined,
          params.limit ? Number(params.limit) : 50
        );

      case "l5_delete_fact":
        m.l5DeleteFact(String(params.fact_id), String(params.session_id));
        return { deleted: true };

      // L6
      case "l6_log_error":
        return { error_id: m.l6LogError({
          sessionId: String(params.session_id),
          errorType: String(params.error_type) as ErrorType,
          summary: String(params.summary),
          detail: params.detail ? String(params.detail) : undefined,
          stackTrace: params.stack_trace ? String(params.stack_trace) : undefined,
        }) };

      case "l6_self_check":
        return m.l6SelfCheck(String(params.session_id));

      default:
        return { error: `Unknown tool: ${name}` };
    }
  };
}

export default definePluginEntry({
  id: "metacognitive-memory",
  name: "Metacognitive Memory",
  description:
    "L0~L6 cognitive memory system with privacy controls. " +
    "Captures and structures conversation content ONLY when allowConversationAccess=true. " +
    "Stores raw logs (L0), extracted memories (L1), scenes (L2), cognitive graphs (L3), " +
    "goal trees (L4), knowledge base (L5), and self-model diagnostics (L6). " +
    "WARNING: May contain sensitive data. Review before enabling in workspaces with " +
    "credentials, regulated data, or proprietary prompts. Use allowConversationAccess=false " +
    "and manual l0_capture for sensitive contexts.",
  register(api: OpenClawPluginApi) {
    const core = getOrCreateCore(api);
    const initPromise = core.initialize();
    const handler = buildExecuteHandler(api);

    // ── Sensitive data redaction ───────────────────────────────────────────
    const REDACT_PATTERNS = [
      /([A-Za-z0-9]{20,}=*[A-Za-z0-9+/=]{20,})/g,  // API keys, tokens
      /(sk-[A-Za-z0-9_-]{20,})/g,                   // OpenAI keys
      /(password|passwd|pwd)[;:]\s*\S+/gi,          // password: xxx
      /(Bearer|Token|Basic)\s+[A-Za-z0-9_.-]+/gi,  // Auth headers
      /(\d{3}-\d{2}-\d{4})/g,                        // SSN
      /(\d{16,19})\s+\d{2}\/\d{2}/g,                 // Credit card
    ];

    function redact(content: string): string {
      let redacted = content;
      for (const pattern of REDACT_PATTERNS) {
        redacted = redacted.replace(pattern, "[REDACTED]");
      }
      return redacted;
    }

    // ── Conversation hooks — require explicit opt-in ─────────────────────
    const hooksConfig = api.pluginConfig as { allowConversationAccess?: boolean } | undefined;
    const allowCapture = hooksConfig?.allowConversationAccess === true;

    if (allowCapture) {
      api.logger.info("[metacognitive-memory] Conversation capture ENABLED (allowConversationAccess=true)");
      const hookHandler = async (event: { type: string; action: string; sessionKey: string; context: Record<string, unknown> }) => {
        try {
          await initPromise;
          let role = "user";
          let content = "";
          if (event.type === "message" && event.action === "received") {
            const ctx = event.context as { content?: string };
            content = ctx?.content ?? "";
            role = "user";
          } else if (event.type === "message" && event.action === "sent") {
            const ctx = event.context as { content?: string };
            content = ctx?.content ?? "";
            role = "assistant";
          } else if (event.type === "session" && event.action === "patch") {
            content = "[session started]";
            role = "system";
          }
          if (content.trim()) {
            await core.l0Capture({ sessionId: event.sessionKey, role, content: redact(content) });
          }
        } catch (err) { api.logger.error(`[metacognitive-memory] hook error: ${err}`); }
      };

      api.registerHook(
        ["message:received", "message:sent", "session:patch"],
        hookHandler as never,
        { name: "metacognitive-memory" }
      );
    } else {
      api.logger.info("[metacognitive-memory] Conversation capture DISABLED (allowConversationAccess=false or unset). Use manual l0_capture for session logging.");
    }

    // ── Register all L0~L6 tools ────────────────────────────────────────────
    const toolDefs: AnyAgentTool[] = tools.map(([name, description, schema]) => {
      const td = {
        name,
        label: name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        description,
        parameters: toolParams(schema as Record<string, unknown>),
        execute: async (_toolCallId: string, params: unknown) => {
          await initPromise;
          const result = handler(name, params as Record<string, unknown>);
          return jsonResult(result);
        },
      };
      return td as unknown as AnyAgentTool;
    });

    for (const t of toolDefs) {
      api.registerTool(t);
    }
    api.logger.info(`[metacognitive-memory] Registered ${toolDefs.length} tools + 3 hooks`);
  },
});