/**
 * Plugin entry using definePluginEntry — gives access to api.registerHook()
 * for automatic global conversation capture (message:received, message:sent).
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
export { tools } from "./index.js";
declare const _default: {
    id: string;
    name: string;
    description: string;
    register(api: OpenClawPluginApi): Promise<void>;
};
export default _default;
//# sourceMappingURL=plugin-entry.d.ts.map