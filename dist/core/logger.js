/**
 * File-based logger for metacognitive-memory plugin.
 * Logs are written to ~/.openclaw/metacognitive-memory/log directory.
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
export class MemoryLogger {
    logDir;
    maxFileSize;
    currentDate;
    consoleEnabled;
    constructor(options = {}) {
        this.logDir = options.logDir || this.getDefaultLogDir();
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.currentDate = this.getTodayString();
        this.consoleEnabled = true;
        // Ensure log directory exists
        this.ensureLogDir();
    }
    getDefaultLogDir() {
        const homeDir = process.env.USERPROFILE || process.env.HOME || ".";
        return join(homeDir, ".openclaw", "metacognitive-memory", "log");
    }
    getTodayString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }
    getLogFilePath() {
        // Check if we need to rotate based on date
        const today = this.getTodayString();
        if (today !== this.currentDate) {
            this.currentDate = today;
        }
        return join(this.logDir, `metacognitive-memory-${this.currentDate}.log`);
    }
    ensureLogDir() {
        if (!existsSync(this.logDir)) {
            mkdirSync(this.logDir, { recursive: true });
        }
    }
    shouldRotate(filePath) {
        try {
            if (existsSync(filePath)) {
                const stats = require("fs").statSync(filePath);
                return stats.size >= this.maxFileSize;
            }
        }
        catch {
            // Ignore errors
        }
        return false;
    }
    getRotatedFilePath() {
        const filePath = this.getLogFilePath();
        const ext = ".log";
        const base = filePath.replace(ext, "");
        for (let i = 1; i <= 10; i++) {
            const rotatedPath = `${base}.${i}${ext}`;
            if (!existsSync(rotatedPath)) {
                return rotatedPath;
            }
        }
        return `${base}.1${ext}`; // Overwrite the oldest if we have too many
    }
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
        return `[${timestamp}] [${level.toUpperCase()}] [metacognitive-memory] ${message}${metaStr}\n`;
    }
    writeLog(level, message, meta) {
        try {
            const messageStr = this.formatMessage(level, message, meta);
            // Console output
            if (this.consoleEnabled) {
                if (level === "error") {
                    console.error(messageStr.trim());
                }
                else if (level === "warn") {
                    console.warn(messageStr.trim());
                }
                else if (level === "info") {
                    console.log(messageStr.trim());
                }
                else {
                    console.debug(messageStr.trim());
                }
            }
            // File output
            let filePath = this.getLogFilePath();
            // Rotate if needed
            if (this.shouldRotate(filePath)) {
                const rotatedPath = this.getRotatedFilePath();
                require("fs").renameSync(filePath, rotatedPath);
            }
            writeFileSync(filePath, messageStr, { flag: "a" });
        }
        catch (err) {
            // If logging fails, don't crash the plugin
            console.error(`[metacognitive-memory] Logger error: ${err}`);
        }
    }
    info(message, meta) {
        this.writeLog("info", message, meta);
    }
    warn(message, meta) {
        this.writeLog("warn", message, meta);
    }
    error(message, meta) {
        this.writeLog("error", message, meta);
    }
    debug(message, meta) {
        this.writeLog("debug", message, meta);
    }
    // Specialized logging methods
    hookEvent(eventName, sessionKey) {
        this.info(`Hook triggered: ${eventName}`, { sessionKey });
    }
    toolCall(toolName, params) {
        this.info(`Tool called: ${toolName}`, { params });
    }
    toolResult(toolName, success, result) {
        this.info(`Tool result: ${toolName}`, { success, result });
    }
    databaseOperation(table, operation, rowsAffected) {
        this.info(`Database operation: ${operation} on ${table}`, { rowsAffected });
    }
    errorEvent(errorType, message, detail) {
        this.error(`Error: ${errorType} - ${message}`, { detail });
    }
    configuration(config) {
        this.info("Plugin configuration loaded", config);
    }
}
// Singleton instance
let loggerInstance = null;
export function getLogger(options) {
    if (!loggerInstance) {
        loggerInstance = new MemoryLogger(options);
    }
    return loggerInstance;
}
export default MemoryLogger;
//# sourceMappingURL=logger.js.map