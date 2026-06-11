/**
 * OpenClaw host adapter — bridges MetaCore to OpenClaw plugin API.
 * Resolves state directory from OpenClaw runtime or config.
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
export interface OpenClawHostAdapterOptions {
    api: OpenClawPluginApi;
    pluginDataDir: string;
    openclawConfig: Record<string, unknown>;
}
export declare class OpenClawHostAdapter {
    private api;
    readonly pluginDataDir: string;
    private openclawConfig;
    constructor(opts: OpenClawHostAdapterOptions);
    get logger(): import("openclaw/plugin-sdk/core").PluginLogger;
    /**
     * Resolves state directory with support for:
     * - Absolute paths (user configured)
     * - `~` prefix (expands to user home directory)
     * - Relative paths (resolved relative to openclaw config directory)
     */
    get stateDir(): string;
    /**
     * Gets the OpenClaw configuration directory from the config object.
     */
    private getOpenClawDir;
    resolveDataPath(subPath: string): string;
}
//# sourceMappingURL=host-adapter.d.ts.map