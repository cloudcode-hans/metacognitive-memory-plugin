/**
 * Ambient module shim for `openclaw/plugin-sdk/core`.
 *
 * The real types live inside the OpenClaw CLI installation
 * (`<openclaw>/dist/plugin-sdk/core.d.ts`) and are resolved at runtime by
 * the loader. This shim is shipped in `src/types/` so contributors can
 * `tsc` the plugin on a machine where `openclaw` is not installed as a
 * dependency.
 *
 * Keep this surface minimal: only the symbols the plugin actually uses.
 */

declare module "openclaw/plugin-sdk/core" {
  // ─── Generic helpers ────────────────────────────────────────────────────
  export type AnyAgentTool = {
    name: string;
    label?: string;
    description: string;
    parameters: unknown;
    execute: (toolCallId: string, params: unknown) => Promise<unknown> | unknown;
  };

  export type PluginLogger = {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
    debug?: (msg: string) => void;
  };

  export type PluginRuntime = {
    state?: { dir?: string };
    [k: string]: unknown;
  };

  export type OpenClawPluginApi = {
    logger: PluginLogger;
    config: Record<string, unknown>;
    pluginConfig?: Record<string, unknown>;
    runtime?: PluginRuntime;
    registerTool: (tool: AnyAgentTool) => void;
    registerHook: (
      names: string | string[],
      handler: (event: unknown) => Promise<void> | void,
      opts?: Record<string, unknown>,
    ) => void;
  };

  // ─── Plugin entry helper ───────────────────────────────────────────────
  // The signature accepts any `register(api)` shape; the `default` export of
  // the plugin entry is the registered plugin.
  export function definePluginEntry<T>(entry: T): T;
  export function definePluginEntry(opts: {
    id: string;
    name: string;
    description?: string;
    register: (api: OpenClawPluginApi) => void | Promise<void>;
  }): {
    id: string;
    name: string;
    description?: string;
    register: (api: OpenClawPluginApi) => void | Promise<void>;
  };

  // Wrap a value as a JSON tool result.
  export function jsonResult(value: unknown): unknown;
}
