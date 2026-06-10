# Metacognitive Memory — OpenClaw Plugin

> L0~L6 six-layer cognitive memory system for OpenClaw agents. Pure **sql.js WASM SQLite** — zero native dependencies, cross-device portable, single-file portable.

[![OpenClaw Plugin](https://img.shields.io/badge/OpenClaw-Plugin-blue)](https://docs.openclaw.ai)
[![sql.js WASM](https://img.shields.io/badge/sql.js-WASM-green)](https://sql.js.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Why

OpenClaw agents start fresh every session. This plugin gives them a long-term, structured memory that mirrors how humans consolidate experience:

| Layer | Name | What it stores | What it's for |
|------:|------|----------------|----------------|
| **L0** | Raw Capture | Unprocessed conversation turns (role + content) | Verbatim journal, the "what actually happened" |
| **L1** | Extraction | Typed memories (preference / fact / decision / context / instruction) with dedup hash | Distilled, reusable knowledge |
| **L2** | Scene Blocks | Narrative scenes (project / decision / interaction / error / growth) with background & result | Coherent episodes you can recall later |
| **L3** | Cognitive Graph | Entities + relations (person / project / supplier / decision / event / concept) | Cross-session knowledge graph |
| **L4** | Goal Tree | Hierarchical goals with status, blocker, priority, parent/child | Multi-step plan tracking |
| **L5** | Knowledge Base | Verified facts with domain, confidence, tags | Searchable, citation-ready facts |
| **L6** | Self-Model | Errors, capability categories, self-diagnostics | "How am I doing?" reports |

Each layer is exposed as an **independent tool** (20 in total) so the agent can compose memory operations just like any other tool call.

---

## Features

- **Zero native dependencies** — `sql.js` is a WASM-compiled SQLite, runs anywhere Node.js runs
- **Cross-device portable** — copy the single `.db` file between machines and your memory travels
<<<<<<< HEAD
- **Automatic L0 capture** — registers `message:received`, `message:sent`, `session:patch` hooks so every conversation is journaled without any extra calls
- **20 independent tools** — one per memory operation, no monolithic "remember" tool
- **Configurable extraction** — `everyNConversations` and `idleTimeoutSeconds` tune when L1 fires
- **Self-diagnostic** — `l6_self_check` returns a JSON summary of error counts and capability categories
- **Per-session isolation** — every row is scoped by `session_id` so multi-agent workloads don't mix
=======
- **Opt-in conversation capture** — set `allowConversationAccess: true` to enable automatic L0 capture via `message:received`/`message:sent` hooks
- **20 independent tools** — one per memory operation, no monolithic "remember" tool
- **Sensitive data redaction** — API keys, passwords, tokens are automatically redacted before storage
- **Per-session isolation** — all mutating operations enforce `session_id` constraints to prevent cross-session access
- **Configurable extraction** — `everyNConversations` and `idleTimeoutSeconds` tune when L1 fires
- **Self-diagnostic** — `l6_self_check` returns a JSON summary of error counts and capability categories

---

## Privacy & Security

⚠️ **WARNING**: This plugin captures and stores conversation content. Review before enabling:

- **DO NOT** enable `allowConversationAccess: true` in workspaces handling credentials, regulated data, or proprietary prompts
- **Disable** automatic capture and use manual `l0_capture` for sensitive contexts
- **Sensitive data** (API keys, passwords, tokens, SSN, credit cards) are automatically redacted, but manual review is still recommended
- All mutation operations enforce session isolation to prevent cross-session data access
>>>>>>> 2898562 (Security audit fixes: session isolation, opt-in capture, data redaction, privacy warnings)

---

## One-shot install (ClawHub)

```bash
# 1. Install
openclaw plugins install metacognitive-memory

<<<<<<< HEAD
# 2. Enable + register the memory slot + grant hook policy.
=======
# 2. Configure (OPT-IN for conversation capture).
>>>>>>> 2898562 (Security audit fixes: session isolation, opt-in capture, data redaction, privacy warnings)
#    Edit ~/.openclaw/openclaw.json:
```

```json
{
  "plugins": {
    "slots": {
      "memory": "metacognitive-memory"
    },
    "entries": {
      "metacognitive-memory": {
        "enabled": true,
        "hooks": {
<<<<<<< HEAD
          "allowPromptInjection": true,
          "allowConversationAccess": true
        },
        "config": {
          "stateDir": "~/.openclaw/state/metacognitive-memory",
=======
          "allowConversationAccess": false
        },
        "config": {
          "stateDir": "~/.openclaw/metacognitive_memory",
>>>>>>> 2898562 (Security audit fixes: session isolation, opt-in capture, data redaction, privacy warnings)
          "everyNConversations": 3,
          "idleTimeoutSeconds": 60
        }
      }
    }
  }
}
```

<<<<<<< HEAD
=======
> ⚠️ **Security**: `allowConversationAccess: false` by default. Only set to `true` if you want automatic conversation capture. Do NOT enable in sensitive workspaces.

>>>>>>> 2898562 (Security audit fixes: session isolation, opt-in capture, data redaction, privacy warnings)
```bash
# 3. Restart the gateway and verify
openclaw gateway restart
openclaw plugins inspect metacognitive-memory
```

Expected: `Status: loaded`, `Origin: config`, `Registered 20 tools + 3 hooks` in `~/.openclaw/logs/openclaw.log`.

### From source (developer / local link)

```bash
git clone <this-repo>
cd metacognitive-memory-plugin
npm install
npm run build                       # tsc → dist/
openclaw plugins install . --link  # link instead of copy; restart picks up source edits
```

The `--link` flag means `dist/` edits are picked up after a gateway restart — no need to re-install.

---

## Hook policy — why these flags matter

<<<<<<< HEAD
The two flags in `entries.metacognitive-memory.hooks` are not optional if you want automatic L0 capture:

- **`allowConversationAccess: true`** — required. The plugin reads the raw inbound/outbound message bodies from `message:received` / `message:sent` events. Without it, those hooks are blocked by core's safety gate and the database stays empty.
- **`allowPromptInjection: true`** — optional but recommended. Lets the plugin mutate prompts through typed hooks (e.g. injecting recalled context). Safe for this plugin because it only injects, never replaces.

If you'd rather not auto-capture, set `allowConversationAccess: false` — the 20 tools still work, you just have to call `l0_capture` yourself.
=======
The `allowConversationAccess` flag controls automatic L0 capture:

- **`allowConversationAccess: true`** — OPT-IN. The plugin reads raw inbound/outbound message bodies from `message:received`/`message:sent` events and stores them in L0. **Only enable in non-sensitive workspaces.**
- **`allowConversationAccess: false`** (default) — Only manual `l0_capture` tool works; hooks are not registered.

> ⚠️ **Security Notice**: This plugin stores conversation content locally. Avoid enabling automatic capture in workspaces handling credentials, regulated data, or proprietary prompts.
>>>>>>> 2898562 (Security audit fixes: session isolation, opt-in capture, data redaction, privacy warnings)

---

## Configuration reference

Pass under `plugins.entries.metacognitive-memory.config`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `stateDir` | string | OpenClaw state dir | Where the SQLite file lives. **Must be writable.** |
| `everyNConversations` | number | `3` | Triggers L1 extraction every N captured turns |
| `idleTimeoutSeconds` | number | `60` | Triggers L1 extraction after N seconds of inactivity |

The values are read by the plugin at startup; restart the gateway to apply changes.

---

## Storage layout

```
<stateDir>/
└── .metacognitive_memory/
    └── memory.db            # single-file SQLite, portable
```

Tables:

| Table | Layer | Purpose |
|-------|-------|---------|
| `memory_l0_raw` | L0 | Raw captures (session_id, role, content, timestamp) |
| `memory_l1_extracted` | L1 | Extracted typed memories (with dedup_hash) |
| `memory_l2_scenes` | L2 | Scene blocks |
| `kg_entity` / `kg_relation` | L3 | Knowledge graph |
| `goal` | L4 | Goal tree (self-referential parent_id) |
| `knowledge_fact` | L5 | Verified facts (with full-text search) |
| `self_model` / `error_log` | L6 | Self-diagnostics |

Backup = copy `memory.db`. The plugin auto-saves on every write.

> The `.metacognitive_memory` subdirectory is intentional — it lets multiple plugins share a parent `stateDir` without colliding.

---

## Tools reference

All 20 tools take `session_id` as the primary key. L4 and L5 also expose id-based update/verify tools.

### L0 — Raw Capture

| Tool | Parameters (besides session_id) |
|------|---------------------------------|
| `l0_capture` | `role` (user/assistant/system/tool), `content`, optional `tool_name` / `tool_result` |
| `l0_list` | optional `limit` (default 50) |

### L1 — Extraction

| Tool | Parameters |
|------|------------|
| `l1_extract` | optional `max_memories` (default 30) |
| `l1_list` | optional `memory_type` filter, `limit` |

### L2 — Scene Blocks

| Tool | Parameters |
|------|------------|
| `l2_create_scene` | `scene_type` (project/decision/interaction/error/growth), `title`, optional `background` / `decision` / `result` |
| `l2_list_scenes` | optional `scene_type` filter, `limit` |

### L3 — Cognitive Graph

| Tool | Parameters |
|------|------------|
| `l3_update_graph` | (none) — rebuilds from L1 |
| `l3_list_entities` | optional `entity_type` filter |
| `l3_list_relations` | optional `from_entity_id` filter |

### L4 — Goal Tree

| Tool | Parameters |
|------|------------|
| `l4_create_goal` | `title`, optional `description` / `parent_id` / `priority` |
| `l4_tree` | returns full recursive tree |
| `l4_update_goal` | `goal_id`, optional `status` / `blocker` / `priority` |
| `l4_delete_goal` | `goal_id` — cascades to children |

### L5 — Knowledge Base

| Tool | Parameters |
|------|------------|
| `l5_add_fact` | `domain`, `fact_text`, optional `confidence` / `tags[]` |
| `l5_search` | `query`, optional `limit` |
| `l5_verify_fact` | `fact_id` |
| `l5_list_facts` | optional `domain` filter |
| `l5_delete_fact` | `fact_id` |

### L6 — Self-Model

| Tool | Parameters |
|------|------------|
| `l6_log_error` | `error_type` (sql/config/logic/tool/recall), `summary`, optional `detail` / `stack_trace` |
| `l6_self_check` | returns `{ errorStats, capCategories, recentErrors }` |

---

## Validation workflow

After install, run these to confirm everything works:

```bash
# 1. Plugin loaded
openclaw plugins inspect metacognitive-memory
#   → Status: loaded

# 2. Gateway registered tools
openclaw gateway restart
grep "metacognitive-memory" ~/.openclaw/logs/openclaw.log | tail
#   → "[metacognitive-memory] Registered 20 tools + 3 hooks"

# 3. DB is created on first call
ls -la ~/.openclaw/state/metacognitive-memory/.metacognitive_memory/memory.db

# 4. Quick end-to-end smoke test from a node REPL
node -e "
import('metacognitive-memory-plugin').then(async (m) => {
  const core = new m.MetaCore({ stateDir: '~/.openclaw/state/metacognitive-memory/.metacognitive_memory' });
  await core.initialize();
  const id = core.l0Capture({ sessionId: 'smoke', role: 'user', content: 'hello' });
  console.log('L0 row:', id);
  console.log('L0 list:', core.l0List('smoke').length, 'rows');
  await core.close();
});
"
```

---

## Common pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `0 tools registered` | Hook policy blocks `allowConversationAccess` | Set both `allowPromptInjection` and `allowConversationAccess` to `true` |
| `stateDir` ignored | Path doesn't exist or isn't writable | Pre-create it; check permissions |
| Empty database | `message:received` hook never fired | Confirm `stateDir` is set; check `~/.openclaw/logs/openclaw.log` for `[metacognitive-memory]` lines |
| Conflict with `active-memory` / `memory-core` / `memory-wiki` | Memory slot already taken | Set `plugins.slots.memory` to `metacognitive-memory` (or `"none"` to disable) — see [OpenClaw memory slots](https://docs.openclaw.ai/concepts/memory) |
| `EACCES` on `memory.db` | Multiple gateway processes on the same stateDir | Pick one owner; or set a per-process `stateDir` |

---

## Architecture

```
metacognitive-memory-plugin/
├── openclaw.plugin.json     # manifest: 20 contract tool names + configSchema
├── package.json             # npm + openclaw.extensions + peer dep
├── tsconfig.json            # portable: no absolute paths
├── src/
│   ├── index.ts             # default entry: definePluginEntry + 20 tools + 3 hooks
│   ├── plugin-entry.ts      # alt entry with the same surface (used by some loaders)
│   ├── core/
│   │   ├── types.ts         # L0~L6 shared types
│   │   ├── meta-core.ts     # L0~L6 orchestration facade
│   │   └── store.ts         # sql.js SQLite store (schema + queries)
│   ├── adapters/openclaw/
│   │   └── host-adapter.ts  # stateDir resolution (config → runtime → default)
│   └── types/
│       └── openclaw-plugin-sdk.d.ts   # ambient shim for `openclaw/plugin-sdk/core`
└── dist/                    # build output (npm `files` includes this)
```

### Data flow

```
message:received ─┐
message:sent     ─┼─→ l0Capture ─→ memory_l0_raw
session:patch    ─┘
                                  │
                          everyNConversations / idleTimeout
                                  │
                                  ▼
                            l1Extract ─→ memory_l1_extracted
                                  │
                  ┌───────────────┼───────────────┐
                  ▼               ▼               ▼
            l2CreateScene   l3UpdateGraph   l5AddFact
                  │               │               │
                  ▼               ▼               ▼
        memory_l2_scenes  kg_entity/kg_rel  knowledge_fact
                                  │
                                  ▼
                            l4CreateGoal ─→ goal
                                  │
                                  ▼
                       l6_log_error / l6_self_check
                                  │
                                  ▼
                            error_log
```

---

## Development

```bash
npm install              # one-time
npm run build            # tsc → dist/
npm run build:watch      # rebuild on save

# Type-check only
npx tsc --project tsconfig.json --noEmit

# Validate the dist entry OpenClaw will load
openclaw plugins validate --entry ./dist/index.js

# Run unit tests
npm test
```

To work on a live OpenClaw instance:

```bash
openclaw plugins install . --link   # link mode
# ...edit src/...
npm run build                       # rebuild dist/
openclaw gateway restart            # pick up new dist/
```

---

## Memory type reference

**L1 Memory Types:** `preference` · `fact` · `decision` · `context` · `instruction`

**L2 Scene Types:** `project` · `decision` · `interaction` · `error` · `growth`

**L3 Entity Types:** `person` · `project` · `supplier` · `decision` · `event` · `concept`

**L4 Goal Status:** `pending` · `in_progress` · `blocked` · `done` · `cancelled`

**L6 Error Types:** `sql_error` · `config_error` · `logic_error` · `tool_error` · `recall_error`

---

## Compatibility

- OpenClaw `>= 2026.5.17`
- Node.js `>= 22.16.0` (sql.js WASM requires modern Node)
- No native build step; works on Windows / macOS / Linux identically

---

## License

MIT
