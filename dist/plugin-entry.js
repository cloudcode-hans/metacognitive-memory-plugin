/**
 * Plugin entry using definePluginEntry — gives access to api.registerHook()
 * for automatic global conversation capture (message:received, message:sent).
 */
import { definePluginEntry, jsonResult } from "openclaw/plugin-sdk/core";
import { getOrCreateCore, buildExecuteHandler, toolParams, tools } from "./dist/index.js";
let initStarted = false;
export default definePluginEntry({
    id: "metacognitive-memory",
    name: "Metacognitive Memory",
    description: "L0~L6 six-layer cognitive memory system with automatic conversation capture. " +
        "Captures every inbound message and outbound reply globally as L0 raw logs, " +
        "extracts structured memories (L1), builds scene blocks (L2), cognitive graphs (L3), " +
        "goal trees (L4), knowledge base (L5), and self-model diagnostics (L6).",
    async register(api) {
        if (initStarted) {
            api.logger.info("[metacognitive-memory] register() called again, skipping (already initialized)");
            return;
        }
        initStarted = true;
        api.logger.info("[metacognitive-memory] === Plugin entry initialization started ===");
        
        api.logger.info("[metacognitive-memory] Creating core instance...");
        const core = getOrCreateCore(api);
        
        api.logger.info("[metacognitive-memory] Initializing memory store...");
        const initPromise = core.initialize();
        
        api.logger.info("[metacognitive-memory] Building tool handler...");
        const handler = buildExecuteHandler(api);
        
        // ── Conversation hooks for automatic global capture ─────────────────────
        api.logger.info("[metacognitive-memory] Registering conversation hooks...");
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
            }, { name: "metacognitive-memory-entry-receive" });
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
            }, { name: "metacognitive-memory-entry-sent" });
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
            api.logger.info("[metacognitive-memory] ✓ Conversation hooks registered successfully");
        
        // ── Register all L0~L6 tools ────────────────────────────────────────────
        api.logger.info(`[metacognitive-memory] Registering ${tools.length} tools...`);
        const toolEntries = tools;
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
        let registeredToolCount = 0;
        for (const tool of toolDefs) {
            try {
                api.registerTool(tool);
                registeredToolCount++;
            } catch (err) {
                api.logger.error(`[metacognitive-memory] ✗ Failed to register tool ${tool.name}: ${err}`);
            }
        }
        api.logger.info(`[metacognitive-memory] ✓ Successfully registered ${registeredToolCount}/${toolDefs.length} tools`);
        api.logger.info("[metacognitive-memory] === Plugin entry initialization completed ===");
    },
});
//# sourceMappingURL=plugin-entry.js.map