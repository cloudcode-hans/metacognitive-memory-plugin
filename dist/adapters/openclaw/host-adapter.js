/**
 * OpenClaw host adapter — bridges MetaCore to OpenClaw plugin API.
 * Resolves state directory from OpenClaw runtime or config.
 */
import { join } from "node:path";
export class OpenClawHostAdapter {
    api;
    pluginDataDir;
    constructor(opts) {
        this.api = opts.api;
        this.pluginDataDir = opts.pluginDataDir;
    }
    get logger() {
        return this.api.logger;
    }
    get stateDir() {
        // Prefer explicit config over runtime state dir
        const cfg = this.api.pluginConfig;
        if (cfg?.stateDir)
            return cfg.stateDir;
        // Fall back to runtime state dir
        const runtime = this.api.runtime;
        if (runtime?.state?.dir)
            return runtime.state.dir;
        // Last resort: workspace root
        return this.pluginDataDir;
    }
    resolveDataPath(subPath) {
        return join(this.stateDir, subPath);
    }
}
//# sourceMappingURL=host-adapter.js.map