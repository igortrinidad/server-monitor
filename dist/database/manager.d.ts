import { DatabaseRecord } from '../types';
export declare class DatabaseManager {
    private db;
    private dbPath;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    private createTables;
    insertMetric(type: string, data: any): Promise<number>;
    getMetrics(type?: string, limit?: number, startDate?: Date, endDate?: Date): Promise<DatabaseRecord[]>;
    getLatestMetric(type: string): Promise<DatabaseRecord | null>;
    deleteOldMetrics(olderThanDays: number): Promise<number>;
    getMetricsCount(type?: string): Promise<number>;
    close(): Promise<void>;
}
//# sourceMappingURL=manager.d.ts.map