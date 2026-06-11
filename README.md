# Metacognitive Memory

[![OpenClaw Plugin](https://img.shields.io/badge/OpenClaw-Plugin-blue)](https://docs.openclaw.ai)
[![SQLite](https://img.shields.io/badge/SQLite-3.x-blue)](https://www.sqlite.org)
[![sqlite-vec](https://img.shields.io/badge/sqlite--vec-Vector-green)](https://github.com/asg017/sqlite-vec)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.4-blue)](package.json)

L0~L6 六层认知记忆系统，为 OpenClaw Agent 提供长期、结构化的记忆能力。基于 **原生 SQLite + sqlite-vec 向量扩展**，支持向量存储和相似性检索。

---

## 目录

- [项目简介](#1-项目简介)
- [功能特性](#2-功能特性)
- [环境要求](#3-环境要求)
- [快速开始](#4-快速开始)
- [配置说明](#5-配置说明)
- [使用示例](#6-使用示例)
- [项目结构](#7-项目结构)
- [数据清理与生命周期](#8-数据清理与生命周期)
- [常见问题](#9-常见问题)
- [许可证](#10-许可证)

---

## 1. 项目简介

OpenClaw Agent 每次会话都是全新的开始。这个插件赋予它们长期、结构化的记忆能力，模拟人类如何整合经验：

| 层级 | 名称 | 存储内容 | 自动化 | 清理策略 |
|------|------|----------|--------|----------|
| **L0** | 原始捕获 | 未处理的对话轮次 (role + content) | ✅ 自动 (hooks) | 按时间 |
| **L1** | 提炼 | 类型化记忆 (偏好/事实/决策/上下文/指令) | ✅ 自动 (每 N 轮) | 按重要性 |
| **L2** | 场景块 | 叙事场景 (project/decision/interaction/error/growth) | ✅ 自动 (L1 后) | 按时间 |
| **L3** | 认知图 | 实体 + 关系 | ✅ 自动 (5+ L1 后) | 按频率 |
| **L4** | 目标树 | 分层目标 (status, blocker, priority) | ⚠️ 半自动 | 按时间 |
| **L5** | 知识库 | 已验证事实 (domain, confidence, tags) | ⚠️ 手动 (高门槛) | 按时间 |
| **L6** | 自我模型 | 错误、能力分类、自我诊断 | ✅ 自动 (事件驱动) | 按时间 |

---

## 2. 功能特性

### 核心能力

- **原生 SQLite** — 使用 better-sqlite3 原生绑定，性能优于 WASM
- **向量检索** — 集成 sqlite-vec 扩展，支持 L1/L3/L5 层向量相似性检索
- **混合检索** — BM25 + 向量 RRF 融合检索，提升语义搜索精度
- **WAL 模式** — 启用 WAL 日志，提升并发写入性能
- **跨设备便携** — 复制单个 `.db` 文件即可迁移记忆
- **L0 自动捕获** — 通过 `message_received`/`message_sent` hooks 自动记录对话
- **L1 状态管理** — 会话状态持久化、检查点、分布式锁支持
- **L1 自动提炼** — 每 N 轮自动从 L0 提取类型化记忆
- **L2 自动场景创建** — L1 提炼后自动生成叙事场景
- **L3 自动图谱更新** — 累积 5+ L1 记忆后自动更新知识图谱
- **L4 目标追踪** — 会话开始时注入 pending/in-progress 目标
- **L5 知识库** — 高置信度事实存储 (confidence ≥ 0.9)，支持向量存储
- **L6 自我诊断** — 工具失败自动记录到自我模型
- **文件索引** — L4/L5/L6 支持 Markdown/YAML 文件 + SQLite 索引
- **智能数据清理** — 基于频率/重要性的动态保留策略
- **跨会话记忆访问** — 支持访问所有会话的记忆数据
- **Prompt 自动注入** — 新会话首次启动时自动注入跨会话记忆

### 安全性

- **敏感数据脱敏** — API keys、密码、tokens 自动脱敏
- **会话隔离** — 默认所有操作强制 `session_id` 约束
- **跨会话控制** — 通过专门工具实现跨会话访问
- **隐私可控** — `allowConversationAccess` 默认启用，可随时关闭

---

## 3. 环境要求

- **Node.js** ≥ 22.0.0
- **OpenClaw** ≥ 2026.5.17
- **better-sqlite3** (原生 SQLite 绑定，自动安装)
- **sqlite-vec** (向量扩展，自动安装)

### 注意事项

- 需要 Node.js 原生编译环境 (python3, make, C++ compiler)
- sqlite-vec 扩展在初始化时会自动加载，如不可用则优雅降级

---

## 4. 快速开始

### 安装

```bash
# 从 ClawHub 安装
openclaw plugins install metacognitive-memory

# 或从源码链接 (开发模式)
cd metacognitive-memory
npm install
npm run build
openclaw plugins install . --link
```

### 配置

编辑 `~/.openclaw/openclaw.json`，在 `plugins.entries` 中添加：

```json
{
  "plugins": {
    "slots": {
      "memory": "metacognitive-memory"
    },
    "entries": {
      "metacognitive-memory": {
        "enabled": true,
        "config": {
          "allowConversationAccess": true,
          "allowPromptInjection": true,
          "l0InjectLimit": 3,
          "l1InjectLimit": 5,
          "crossSessionInjectLimit": 5,
          "everyNConversations": 3,
          "idleTimeoutSeconds": 60,
          "l3UpdateThreshold": 5,
          "defaultRetentionDays": 90,
          "highFreqRetentionDays": 180,
          "mediumFreqRetentionDays": 90,
          "lowFreqRetentionDays": 30,
          "highFreqThreshold": 10,
          "mediumFreqThreshold": 3
        }
      }
    }
  }
}
```

### 验证

```bash
openclaw gateway restart
openclaw plugins inspect metacognitive-memory
```

应显示：`Status: loaded`, `Registered 42 tools`

---

## 5. 配置说明

### 完整配置示例

```json
{
  "plugins": {
    "slots": {
      "memory": "metacognitive-memory"
    },
    "entries": {
      "metacognitive-memory": {
        "enabled": true,
        "config": {
          "allowConversationAccess": true,
          "allowPromptInjection": true,
          "l0InjectLimit": 3,
          "l1InjectLimit": 5,
          "crossSessionInjectLimit": 5,
          "everyNConversations": 3,
          "idleTimeoutSeconds": 60,
          "l3UpdateThreshold": 5,
          "defaultRetentionDays": 90,
          "highFreqRetentionDays": 180,
          "mediumFreqRetentionDays": 90,
          "lowFreqRetentionDays": 30,
          "highFreqThreshold": 10,
          "mediumFreqThreshold": 3
        }
      }
    }
  }
}
```

### 配置项详解

#### 核心开关

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `allowConversationAccess` | boolean | `true` | 启用 L0 自动捕获。自动记录 `message:received`/`message:sent` 到 `memory_l0_raw` 表 |
| `allowPromptInjection` | boolean | `true` | 启用 Prompt 注入。通过 `before_prompt_build` hook 将 L0/L1 记忆注入到 Agent prompt |

#### Prompt 注入控制

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `l0InjectLimit` | number | `3` | 单会话注入的 L0 记录数量（0 = 禁用）。建议 3 条，控制 token 消耗 |
| `l1InjectLimit` | number | `5` | 单会话注入的 L1 记录数量（0 = 禁用）。建议 5 条 |
| `crossSessionInjectLimit` | number | `5` | 新会话首次启动时注入的跨会话 L0 记录数量（0 = 禁用）。帮助 Agent 记住之前的对话 |

#### 自动化触发

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `everyNConversations` | number | `3` | 每 N 轮对话触发一次 L1 提炼 |
| `idleTimeoutSeconds` | number | `60` | 空闲 N 秒后触发 L1 提炼（与 `everyNConversations` 互斥，取先触发者） |
| `l3UpdateThreshold` | number | `5` | 累积 N 个 L1 记忆后触发 L3 知识图谱更新 |

#### 数据保留策略

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `defaultRetentionDays` | number | `90` | 默认数据保留天数 |
| `highFreqRetentionDays` | number | `180` | 高频数据（importance ≥ 0.8 或 frequency ≥ 10）保留天数 |
| `mediumFreqRetentionDays` | number | `90` | 中频数据（importance ≥ 0.5 或 frequency ≥ 3）保留天数 |
| `lowFreqRetentionDays` | number | `30` | 低频数据保留天数 |
| `highFreqThreshold` | number | `10` | 高频阈值：实体 frequency ≥ 10 或 L1 importance ≥ 0.8 |
| `mediumFreqThreshold` | number | `3` | 中频阈值：实体 frequency ≥ 3 或 L1 importance ≥ 0.5 |

#### 存储配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `stateDir` | string | OpenClaw state dir | SQLite 数据库文件存储目录 |

### 各配置项对 L0~L6 的影响

| 配置项 | 影响层级 |
|--------|----------|
| `allowConversationAccess` | L0 捕获 |
| `everyNConversations` / `idleTimeoutSeconds` | L1 提炼触发 |
| `l3UpdateThreshold` | L3 图谱更新触发 |
| `l0InjectLimit` / `l1InjectLimit` | Prompt 注入（当前会话） |
| `crossSessionInjectLimit` | Prompt 注入（新会话跨会话） |
| `*RetentionDays` / `*Threshold` | L0~L6 清理策略 |

---

## 6. 使用示例

### 启用后自动发生的事

1. **L0 捕获**：每次对话自动记录到 `memory_l0_raw`
2. **L1 提炼**：每 3 轮自动提取类型化记忆
3. **L2 场景**：L1 提炼后自动创建叙事场景
4. **L3 图谱**：累积 5+ L1 后自动更新知识图谱
5. **Prompt 注入**：历史记忆自动注入到 Agent prompt

### Agent 手动调用工具

#### L0 原始捕获

```
l0_capture(session_id, role, content)
l0_list(session_id, limit)
l0_list_all(limit)              # 跨会话访问
```

#### L1 提炼

```
l1_extract(session_id, max_memories)
l1_list(session_id, memory_type, limit)
l1_list_all(limit)              # 跨会话访问
```

#### L2 场景

```
l2_create_scene(session_id, scene_type, title, background, result)
l2_list_scenes(session_id, scene_type, limit)
```

#### L3 认知图

```
l3_update_graph(session_id)
l3_list_entities(session_id, entity_type, limit)
l3_list_relations(session_id, from_entity_id, limit)
l3_fts_search(session_id, query, limit)
l3_hybrid_search(session_id, query, limit)
```

#### L4 目标树

```
l4_create_goal(session_id, title, description, parent_id, priority)
l4_tree(session_id)
l4_update_goal(session_id, goal_id, status, blocker, priority)
l4_delete_goal(session_id, goal_id)
```

#### L5 知识库

```
l5_add_fact(session_id, domain, fact_text, confidence, tags)
l5_search(session_id, query, limit)
l5_verify_fact(session_id, fact_id)
l5_list_facts(session_id, domain, limit)
l5_delete_fact(session_id, fact_id)
l5_vector_search(session_id, query_embedding, limit)
```

#### L6 自我模型

```
l6_log_error(session_id, error_type, summary, detail, stack_trace)
l6_self_check(session_id)
```

#### 数据清理工具

```
get_storage_stats()                         # 获取存储统计
purge_old_by_age(days, session_id?)         # 按时间清理
purge_by_frequency(min_frequency, max_days, session_id?)  # 按频率清理
smart_purge(params)                         # 智能清理
```

---

## 7. 项目结构

```
metacognitive-memory/
├── openclaw.plugin.json     # 插件清单: 42 个工具声明 + 配置 schema
├── package.json             # npm 包配置
├── tsconfig.json            # TypeScript 配置
├── README.md               # 本文档
├── LICENSE                 # MIT 许可证
├── src/
│   ├── plugin-entry.ts      # 插件入口: definePluginEntry + 工具 + hooks
│   ├── core/
│   │   ├── types.ts        # L0~L6 类型定义
│   │   ├── meta-core.ts    # L0~L6 编排门面
│   │   ├── store.ts        # SQLite 存储 + 质量过滤
│   │   ├── migration.ts    # 数据库迁移
│   │   └── logger.ts       # 日志系统
│   ├── adapters/openclaw/
│   │   └── host-adapter.ts # stateDir 解析
│   └── types/
│       └── openclaw-plugin-sdk.d.ts  # SDK 类型
└── dist/                   # 构建输出
```

### 数据存储

```
~/.openclaw/metacognitive_memory/
└── memory.db               # SQLite 数据库 (单文件便携)
```

**数据表**：

| 表 | 层级 | 用途 |
|----|------|------|
| `memory_l0_raw` | L0 | 原始捕获记录 |
| `session_state` | L1 | 会话状态/锁/TTL |
| `memory_l1_extracted` | L1 | 类型化记忆 |
| `memory_l2_scenes` | L2 | 叙事场景 |
| `kg_entity` / `kg_relation` | L3 | 知识图谱 |
| `semantic_fts` | L3 | FTS5 全文索引 |
| `goal` | L4 | 目标树 |
| `knowledge_fact` | L5 | 已验证事实 |
| `self_model` / `error_log` | L6 | 自我诊断 |
| `file_index` | L4 | 文件索引 |
| `memory_embeddings` | L1/L3/L5 | 向量存储 |

---

## 8. 数据清理与生命周期

### 智能清理策略

系统根据数据的访问频率和重要性动态调整保留时间：

| 频率/重要性 | 保留天数 | 适用对象 |
|-------------|----------|----------|
| 高 | 180 天 | L1 记忆 (importance ≥ 0.8)、L3 实体 (frequency ≥ 10) |
| 中 | 90 天 | L1 记忆 (importance ≥ 0.5)、L3 实体 (frequency ≥ 3) |
| 低 | 30 天 | L1 记忆 (importance < 0.5)、L3 实体 (frequency < 3) |

### 清理工具使用示例

```javascript
// 获取当前存储统计
get_storage_stats()
// 返回: { stats: { memory_l0_raw: 30, ... }, totalRows: 59 }

// 按时间清理所有30天前的数据
purge_old_by_age({ days: 30 })

// 按频率清理低频实体
purge_by_frequency({ 
  min_frequency: 3, 
  max_days: 30, 
  session_id: "abc123" 
})

// 智能清理（推荐）
smart_purge({
  default_retention_days: 90,
  high_freq_retention_days: 180,
  medium_freq_retention_days: 90,
  low_freq_retention_days: 30,
  high_freq_threshold: 10,
  medium_freq_threshold: 3
})
```

### 跨会话记忆访问

```javascript
// 查看所有会话的 L0 原始日志
l0_list_all({ limit: 50 })

// 查看所有会话的 L1 提炼记忆
l1_list_all({ limit: 50 })
```

---

## 9. 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| L0 只捕获 user 消息 | `allowConversationAccess` 未启用 | 设置 `allowConversationAccess: true` |
| 无 L1 记忆 | L0 轮次未达阈值 | 检查 `everyNConversations` 设置 |
| Memory Context 未注入 | `allowPromptInjection` 未启用 | 设置 `allowPromptInjection: true` |
| 新会话没有跨会话记忆 | `crossSessionInjectLimit` 为 0 | 设置 `crossSessionInjectLimit: 5` |
| Prompt 注入 token 过多 | `l0InjectLimit` / `l1InjectLimit` 过高 | 降低到建议值（3/5） |
| `stateDir` 被忽略 | 路径不存在或无写权限 | 预创建目录并检查权限 |
| Hook 冲突 | Memory slot 已被占用 | 设置 `plugins.slots.memory` 为 `metacognitive-memory` |
| 知识图谱实体质量差 | 实体名含停用词/碎片文本 | 已实现中文停用词过滤和英文片段过滤 |

### 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                    Automatic Layers                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  message_received ─────────────────┐                       │
│  message_sent       ────────────────┼──→ l0Capture ────→ L0 │
│                                                             │
│                                         everyNConversations │
│                                         (default 3 turns)   │
│                                                     │       │
│                                                     ▼       │
│                                              l1Extract ────→ L1
│                                                     │       │
│                              ┌──────────────────────┼──────┤
│                              ▼                      ▼      │
│                       L2CreateScene            L3UpdateGraph│
│                              │                      │       │
│                              ▼                      ▼       │
│                           L2 scenes            L3 graph   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Prompt Injection                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  before_prompt_build hook                                  │
│      │                                                      │
│      ├── Current session: L0 × l0InjectLimit              │
│      │         + L1 × l1InjectLimit                        │
│      │                                                      │
│      └── New session: cross-session L0 × crossSessionInjectLimit
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Manual Layers                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  L4 (Goals):      Check l4_tree at session start           │
│  L5 (Facts):      Only with confidence ≥ 0.9               │
│  L6 (Errors):     tool_result_persist hook auto-logs        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Data Lifecycle                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  L0/L1/L2/L4/L5/L6 ──→ purge_old_by_age(days)             │
│  L3 Entities       ──→ purge_by_frequency(min_freq, days) │
│  All Layers        ──→ smart_purge(config)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

## 致谢

- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - 高性能 SQLite 原生绑定
- [sqlite-vec](https://github.com/asg017/sqlite-vec) - SQLite 向量扩展
- [OpenClaw](https://docs.openclaw.ai) - Agent 运行时框架
- [TypeBox](https://github.com/sinclairzx81/typebox) - TypeScript JSON Schema 类型