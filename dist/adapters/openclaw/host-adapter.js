/**
 * OpenClaw host adapter — bridges MetaCore to OpenClaw plugin API.
 * Resolves state directory from OpenClaw runtime or config.
 */
import { join, isAbsolute, resolve } from "node:path";
import { homedir } from "node:os";
export class OpenClawHostAdapter {
    api;
    pluginDataDir;
    openclawConfig;
    constructor(opts) {
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
    get stateDir() {
        const cfg = this.api.pluginConfig;
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
        const runtime = this.api.runtime;
        if (runtime?.state?.dir)
            return runtime.state.dir;
        // Last resort: use ~/.openclaw as the canonical state root
        return join(homedir(), ".openclaw");
    }
    /**
     * Gets the OpenClaw configuration directory from the config object.
     */
    getOpenClawDir() {
        try {
            // openclawConfig may contain the config file path or config dir
            const config = this.openclawConfig;
            if (typeof config === "object" && config !== null) {
                // Try to find the config directory from config object
                const configFile = config["configFile"];
                if (configFile) {
                    const dir = resolve(configFile, "..");
                    return dir;
                }
            }
        }
        catch {
            // Ignore errors
        }
        return undefined;
    }
    resolveDataPath(subPath) {
        return join(this.stateDir, subPath);
    }
}
//# sourceMappingURL=host-adapter.js.map