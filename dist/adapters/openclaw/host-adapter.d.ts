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
    constructor(opts: OpenClawHostAdapterOptions);
    get logger(): import("openclaw/plugin-sdk/core").PluginLogger;
    get stateDir(): string;
    resolveDataPath(subPath: string): string;
}
//# sourceMappingURL=host-adapter.d.ts.map