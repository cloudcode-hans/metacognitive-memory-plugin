/**
 * OpenClaw host adapter — bridges MetaCore to OpenClaw plugin API.
 * Resolves state directory from OpenClaw runtime or config.
 */

import { join, isAbsolute, resolve } from "node:path";
import { homedir } from "node:os";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

export interface OpenClawHostAdapterOptions {
  api: OpenClawPluginApi;
  pluginDataDir: string;
  openclawConfig: Record<string, unknown>;
}

export class OpenClawHostAdapter {
  private api: OpenClawPluginApi;
  readonly pluginDataDir: string;
  private openclawConfig: Record<string, unknown>;

  constructor(opts: OpenClawHostAdapterOptions) {
    this.api = opts.api;
    this.pluginDataDir = opts.pluginDataDir;
    this.openclawConfig = opts.openclawConfig;
  }

  get logger() {
    return this.api.logger;
  }

  /**
   * Resolves state directory with support for:
   * - Absolute paths (user configured)
   * - `~` prefix (expands to user home directory)
   * - Relative paths (resolved relative to openclaw config directory)
   */
  get stateDir(): string {
    const cfg = this.api.pluginConfig as Record<string, string | undefined> | undefined;
    const configuredPath = cfg?.stateDir;

    if (configuredPath) {
      // Expand ~ to user home directory
      if (configuredPath.startsWith("~/") || configuredPath === "~") {
        return join(homedir(), configuredPath.slice(1));
      }
      // Return absolute paths as-is
      if (isAbsolute(configuredPath)) {
        return configuredPath;
      }
      // Resolve relative paths against openclaw config directory
      const openclawDir = this.getOpenClawDir();
      if (openclawDir) {
        return resolve(openclawDir, configuredPath);
      }
      // Fallback: treat as relative to plugin data dir
      return resolve(this.pluginDataDir, configuredPath);
    }

    // Fall back to runtime state dir
    const runtime = this.api.runtime as { state?: { dir?: string } } | undefined;
    if (runtime?.state?.dir) return runtime.state.dir;

    // Last resort: use ~/.openclaw as the canonical state root
    return join(homedir(), ".openclaw");
  }

  /**
   * Gets the OpenClaw configuration directory from the config object.
   */
  private getOpenClawDir(): string | undefined {
    try {
      // openclawConfig may contain the config file path or config dir
      const config = this.openclawConfig;
      if (typeof config === "object" && config !== null) {
        // Try to find the config directory from config object
        const configFile = config["configFile"] as string | undefined;
        if (configFile) {
          const dir = resolve(configFile, "..");
          return dir;
        }
      }
    } catch {
      // Ignore errors
    }
    return undefined;
  }

  resolveDataPath(subPath: string): string {
    return join(this.stateDir, subPath);
  }
}