/**
 * Migration utilities for upgrading from sql.js to native SQLite.
 */
export declare function migrateFromSqlJs(oldDbPath: string, newDbPath: string): Promise<{
    migrated: boolean;
    tables: string[];
    rowCounts: Record<string, number>;
}>;
export declare function checkMigrationNeeded(dbPath: string): Promise<boolean>;
//# sourceMappingURL=migration.d.ts.map