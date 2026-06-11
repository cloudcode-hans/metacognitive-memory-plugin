/**
 * File-based logger for metacognitive-memory plugin.
 * Logs are written to ~/.openclaw/metacognitive-memory/log directory.
 */
export interface LoggerOptions {
    logDir?: string;
    maxFileSize?: number;
}
export declare class MemoryLogger {
    private logDir;
    private maxFileSize;
    private currentDate;
    private consoleEnabled;
    constructor(options?: LoggerOptions);
    private getDefaultLogDir;
    private getTodayString;
    private getLogFilePath;
    private ensureLogDir;
    private shouldRotate;
    private getRotatedFilePath;
    private formatMessage;
    private writeLog;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
    hookEvent(eventName: string, sessionKey?: string): void;
    toolCall(toolName: string, params?: Record<string, unknown>): void;
    toolResult(toolName: string, success: boolean, result?: unknown): void;
    databaseOperation(table: string, operation: string, rowsAffected: number): void;
    errorEvent(errorType: string, message: string, detail?: string): void;
    configuration(config: Record<string, unknown>): void;
}
export declare function getLogger(options?: LoggerOptions): MemoryLogger;
export default MemoryLogger;
//# sourceMappingURL=logger.d.ts.map