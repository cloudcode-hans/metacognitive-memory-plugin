/**
 * OpenClaw host adapter — bridges MetaCore to OpenClaw plugin API.
 * Resolves state directory from OpenClaw runtime or config.
 */

import { join } from "node:path";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

export interface OpenClawHostAdapterOptions {
  api: OpenClawPluginApi;
  pluginDataDir: string;
  openclawConfig: Record<string, unknown>;
}

export class OpenClawHostAdapter {
  private api: OpenClawPluginApi;
  readonly pluginDataDir: string;

  constructor(opts: OpenClawHostAdapterOptions) {
    this.api = opts.api;
    this.pluginDataDir = opts.pluginDataDir;
  }

  get logger() {
    return this.api.logger;
  }

  get stateDir(): string {
    // Prefer explicit config over runtime state dir
    const cfg = this.api.pluginConfig as Record<string, string | undefined> | undefined;
    if (cfg?.stateDir) return cfg.stateDir;

    // Fall back to runtime state dir
    const runtime = this.api.runtime as { state?: { dir?: string } } | undefined;
    if (runtime?.state?.dir) return runtime.state.dir;

    // Last resort: workspace root
    return this.pluginDataDir;
  }

  resolveDataPath(subPath: string): string {
    return join(this.stateDir, subPath);
  }
}