/**
 * Plugin entry using definePluginEntry — gives access to api.registerHook()
 * for automatic global conversation capture (message:received, message:sent).
 */

import { definePluginEntry, jsonResult } from "openclaw/plugin-sdk/core";
import type { OpenClawPluginApi, AnyAgentTool } from "openclaw/plugin-sdk/core";

let initStarted = false;

export default definePluginEntry({
  id: "metacognitive-memory",
  name: "Metacognitive Memory",
  description:
    "L0~L6 six-layer cognitive memory system with automatic conversation capture. " +
    "Captures every inbound message and outbound reply globally as L0 raw logs, " +
    "extracts structured memories (L1), builds scene blocks (L2), cognitive graphs (L3), " +
    "goal trees (L4), knowledge base (L5), and self-model diagnostics (L6).",

  async register(api: OpenClawPluginApi) {
    if (initStarted) return;
    initStarted = true;
    // @ts-ignore - dist/index.js is generated at runtime
    const { getOrCreateCore, buildExecuteHandler, toolParams, tools } = await import("./dist/index.js");
    
    const core = getOrCreateCore(api);
    const initPromise = core.initialize();
    const handler = buildExecuteHandler(api);

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

    // ── Prompt injection hook — injects L0/L1 memories into agent prompt ──────
    const allowPromptInjection = api.pluginConfig?.allowPromptInjection === true;
    if (allowPromptInjection) {
      api.on("before_prompt_build", async (event, ctx) => {
        try {
          const e = event;
          const sessionId = ctx?.sessionKey as string;
          const prompt = e?.prompt as Array<{ role: string; content: string }>;
          
          if (!sessionId || !prompt) {
            api.logger.debug(`[metacognitive-memory] before_prompt_build: missing sessionKey or prompt`);
            return;
          }

          api.logger.info(`[metacognitive-memory] before_prompt_build called for session ${sessionId.substring(0, 30)}`);

          // Get injection limits from config
          const l0Limit = Number(api.pluginConfig?.l0InjectLimit ?? 3);
          const l1Limit = Number(api.pluginConfig?.l1InjectLimit ?? 5);

          // Get recent L0 memories
          const l0Records = l0Limit > 0 ? core.l0List(sessionId, l0Limit) : [];
          // Get recent L1 extractions
          const l1Records = l1Limit > 0 ? core.l1List(sessionId, undefined, l1Limit) : [];

          api.logger.info(`[metacognitive-memory] L0 records: ${l0Records.length}, L1 records: ${l1Records.length}`);

          // Build memory context
          const memoryLines: string[] = ["\n\n[Memory Context]"];

          // ── New session detection: inject cross-session memories ──────────────
          const crossSessionL0 = l0Records.length === 0 && l1Records.length === 0;
          if (crossSessionL0) {
            // This is a NEW session — inject cross-session memories
            const crossLimit = Number(api.pluginConfig?.crossSessionInjectLimit ?? 5);
            if (crossLimit > 0) {
              const crossRecords = core.l0ListAll(crossLimit);
              if (crossRecords.length > 0) {
                memoryLines.push("--- 历史记忆 (跨会话) ---");
                // Group by session to show context
                const bySession = new Map<string, typeof crossRecords>();
                for (const r of crossRecords) {
                  const parts = r.sessionId.split(":");
                  const shortSession = parts.slice(-2).join(":"); // Last 2 parts
                  if (!bySession.has(shortSession)) bySession.set(shortSession, []);
                  bySession.get(shortSession)!.push(r);
                }
                for (const [shortSession, records] of bySession) {
                  memoryLines.push(`\n[会话: ${shortSession}]`);
                  for (const r of records) {
                    const content = r.content.length > 150 ? r.content.substring(0, 150) + "..." : r.content;
                    memoryLines.push(`[${r.role}] ${content}`);
                  }
                }
                api.logger.info(`[metacognitive-memory] New session detected — injected ${crossRecords.length} cross-session L0 memories`);
              }
            }
          }

          if (l0Records.length > 0) {
            memoryLines.push("--- Recent Conversation (L0) ---");
            for (const r of l0Records) {
              const content = r.content.length > 200 ? r.content.substring(0, 200) + "..." : r.content;
              memoryLines.push(`[${r.role}] ${content}`);
            }
          }

          if (l1Records.length > 0) {
            memoryLines.push("--- Extracted Memories (L1) ---");
            for (const m of l1Records) {
              memoryLines.push(`[${m.memory_type}] ${m.memory_text}`);
            }
          }

          if (memoryLines.length <= 1) {
            api.logger.debug("[metacognitive-memory] No memories to inject");
            return;
          }

          memoryLines.push("[/Memory Context]\n");

          // Inject at the end of prompt (after system prompt, before user input)
          const lastSystemIdx = prompt.map(m => m.role).lastIndexOf("system");
          const injectIdx = lastSystemIdx >= 0 ? lastSystemIdx + 1 : 0;
          prompt.splice(injectIdx, 0, {
            role: "system",
            content: memoryLines.join("\n"),
          });

          api.logger.info(`[metacognitive-memory] Injected ${l0Records.length} L0 + ${l1Records.length} L1 memories into prompt`);
        } catch (err) {
          api.logger.error(`[metacognitive-memory] before_prompt_build error: ${err}`);
        }
      });
      api.logger.info("[metacognitive-memory] Registered before_prompt_build hook (allowPromptInjection=true)");
    }

    const toolEntries: readonly (readonly [string, string, Record<string, unknown>])[] = tools;

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