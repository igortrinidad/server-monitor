import { EventEmitter } from 'events';
import { MonitorConfig, MemoryUsage, CpuUsage, DiskUsage, PM2ProcessInfo } from './types';
export declare class ServerMonitor extends EventEmitter {
    private memoryMonitor;
    private cpuMonitor;
    private diskMonitor;
    private pm2Monitor;
    private databaseManager;
    private config;
    private intervalId;
    private isRunning;
    constructor(config?: Partial<MonitorConfig>);
    initialize(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    private collectMetrics;
    private cleanupOldRecords;
    getMemoryUsage(): Promise<MemoryUsage>;
    getCpuUsage(): Promise<CpuUsage>;
    getDiskUsage(): Promise<DiskUsage>;
    getPM2Processes(): Promise<PM2ProcessInfo[]>;
    getPM2Logs(appName?: string, lines?: number): Promise<string>;
    getHistoricalData(type: 'memory' | 'cpu' | 'disk' | 'pm2', limit?: number, startDate?: Date, endDate?: Date): Promise<{
        timestamp: Date;
        data: any;
    }[]>;
    getLatestMetrics(): Promise<{
        memory: any;
        cpu: any;
        disk: any;
        pm2: any;
    }>;
    getConfig(): MonitorConfig;
    updateConfig(newConfig: Partial<MonitorConfig>): void;
    isMonitoringActive(): boolean;
}
//# sourceMappingURL=ServerMonitor.d.ts.map