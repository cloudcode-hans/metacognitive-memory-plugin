/**
 * Plugin entry using definePluginEntry — gives access to api.registerHook()
 * for automatic global conversation capture (message:received, message:sent).
 */

import { definePluginEntry, jsonResult } from "openclaw/plugin-sdk/core";
import { getOrCreateCore, buildExecuteHandler, toolParams } from "./index.js";
import type { OpenClawPluginApi, AnyAgentTool } from "openclaw/plugin-sdk/core";

// Re-export tools array so plugin-entry can build AnyAgentTool[] from it
export { tools } from "./index.js";

export default definePluginEntry({
  id: "metacognitive-memory",
  name: "Metacognitive Memory",
  description:
    "L0~L6 six-layer cognitive memory system with automatic conversation capture. " +
    "Captures every inbound message and outbound reply globally as L0 raw logs, " +
    "extracts structured memories (L1), builds scene blocks (L2), cognitive graphs (L3), " +
    "goal trees (L4), knowledge base (L5), and self-model diagnostics (L6).",

  async register(api: OpenClawPluginApi) {
    // ── Initialize singleton core once ─────────────────────────────────────
    const core = getOrCreateCore(api);
    const initPromise = core.initialize();
    const handler = buildExecuteHandler(api);

    // ── Conversation hooks for automatic global capture ─────────────────────

    // message:received — every inbound user message
    api.registerHook("message:received", async (event) => {
      try {
        const e = event as { sessionKey: string; context: { content?: string } };
        const ctx = e.context;
        await core.l0Capture({
          sessionId: e.sessionKey,
          role: "user",
          content: ctx?.content ?? "",
        });
      } catch (err) {
        api.logger.error(`[metacognitive-memory] message:received error: ${err}`);
      }
    });

    // message:sent — every outbound assistant reply (covers LLM output)
    api.registerHook("message:sent", async (event) => {
      try {
        const e = event as { sessionKey: string; context: { content?: string } };
        const ctx = e.context;
        if (ctx?.content?.trim()) {
          await core.l0Capture({
            sessionId: e.sessionKey,
            role: "assistant",
            content: ctx.content,
          });
        }
      } catch (err) {
        api.logger.error(`[metacognitive-memory] message:sent error: ${err}`);
      }
    });

    // session:patch — detect new sessions
    api.registerHook("session:patch", async (event) => {
      try {
        const e = event as { sessionKey: string };
        await core.l0Capture({
          sessionId: e.sessionKey,
          role: "system",
          content: "[session started]",
        });
      } catch (err) {
        api.logger.error(`[metacognitive-memory] session:patch error: ${err}`);
      }
    });

    // ── Register all L0~L6 tools ────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import("./index.js") as any;
    const toolEntries: readonly (readonly [string, string, Record<string, unknown>])[] = mod.tools;

    const toolDefs: AnyAgentTool[] = toolEntries.map((toolEntry) => {
      const [name, description, schema] = toolEntry as readonly [string, string, Record<string, unknown>];
      const toolDef: AnyAgentTool = {
        name,
        label: name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        description,
        parameters: toolParams(schema),
        execute: async (_toolCallId: string, params: unknown) => {
          await initPromise;
          const result = handler(name as Parameters<typeof handler>[0], params as Record<string, unknown>);
          return jsonResult(result);
        },
      };
      return toolDef;
    });

    for (const tool of toolDefs) {
      api.registerTool(tool);
    }

    api.logger.info(
      `[metacognitive-memory] Registered ${toolDefs.length} tools + 3 conversation hooks`
    );
  },
});