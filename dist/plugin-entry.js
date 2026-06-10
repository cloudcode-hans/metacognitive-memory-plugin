/**
 * Plugin entry using definePluginEntry — gives access to api.registerHook()
 * for automatic global conversation capture (message:received, message:sent).
 */
import { definePluginEntry, jsonResult } from "openclaw/plugin-sdk/core";
import { getOrCreateCore, buildExecuteHandler, toolParams } from "./index.js";
// Re-export tools array so plugin-entry can build AnyAgentTool[] from it
export { tools } from "./index.js";
export default definePluginEntry({
    id: "metacognitive-memory",
    name: "Metacognitive Memory",
    description: "L0~L6 six-layer cognitive memory system with automatic conversation capture. " +
        "Captures every inbound message and outbound reply globally as L0 raw logs, " +
        "extracts structured memories (L1), builds scene blocks (L2), cognitive graphs (L3), " +
        "goal trees (L4), knowledge base (L5), and self-model diagnostics (L6).",
    async register(api) {
        // ── Initialize singleton core once ─────────────────────────────────────
        const core = getOrCreateCore(api);
        const initPromise = core.initialize();
        const handler = buildExecuteHandler(api);
        // ── Check hook permissions from config ─────────────────────────────────
        const hooksConfig = api.config?.plugins?.entries?.["metacognitive-memory"]?.hooks;
        const allowConversationAccess = hooksConfig?.allowConversationAccess ?? false;
        const allowPromptInjection = hooksConfig?.allowPromptInjection ?? false;
        api.logger.info(`[metacognitive-memory] allowConversationAccess=${allowConversationAccess}, allowPromptInjection=${allowPromptInjection}`);
        // ── Conversation hooks for automatic global capture (OPT-IN) ───────────
        if (allowConversationAccess) {
            // message:received — every inbound user message
            api.registerHook("message:received", async (event) => {
                try {
                    const e = event;
                    const ctx = e.context;
                    await core.l0Capture({
                        sessionId: e.sessionKey,
                        role: "user",
                        content: ctx?.content ?? "",
                    });
                }
                catch (err) {
                    api.logger.error(`[metacognitive-memory] message:received error: ${err}`);
                }
            });
            // message:sent — every outbound assistant reply (covers LLM output)
            api.registerHook("message:sent", async (event) => {
                try {
                    const e = event;
                    const ctx = e.context;
                    if (ctx?.content?.trim()) {
                        await core.l0Capture({
                            sessionId: e.sessionKey,
                            role: "assistant",
                            content: ctx.content,
                        });
                    }
                }
                catch (err) {
                    api.logger.error(`[metacognitive-memory] message:sent error: ${err}`);
                }
            });
            // session:patch — detect new sessions
            api.registerHook("session:patch", async (event) => {
                try {
                    const e = event;
                    await core.l0Capture({
                        sessionId: e.sessionKey,
                        role: "system",
                        content: "[session started]",
                    });
                }
                catch (err) {
                    api.logger.error(`[metacognitive-memory] session:patch error: ${err}`);
                }
            });
        }
        else {
            api.logger.info(`[metacognitive-memory] Conversation capture disabled. Use l0_capture tool for manual capture.`);
        }
        // ── Register all L0~L6 tools ────────────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = await import("./index.js");
        const toolEntries = mod.tools;
        const toolDefs = toolEntries.map((toolEntry) => {
            const [name, description, schema] = toolEntry;
            const toolDef = {
                name,
                label: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                description,
                parameters: toolParams(schema),
                execute: async (_toolCallId, params) => {
                    await initPromise;
                    const result = handler(name, params);
                    return jsonResult(result);
                },
            };
            return toolDef;
        });
        for (const tool of toolDefs) {
            api.registerTool(tool);
        }
        api.logger.info(`[metacognitive-memory] Registered ${toolDefs.length} tools + 3 conversation hooks`);
    },
});
//# sourceMappingURL=plugin-entry.js.map