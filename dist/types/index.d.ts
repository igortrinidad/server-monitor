export interface SystemMetrics {
    timestamp: Date;
    memoryUsage: MemoryUsage;
    cpuUsage: CpuUsage;
    diskUsage: DiskUsage;
}
export interface MemoryUsage {
    total: number;
    used: number;
    free: number;
    percentage: number;
    topProcesses: ProcessInfo[];
}
export interface CpuUsage {
    percentage: number;
    loadAverage: number[];
    topProcesses: ProcessInfo[];
}
export interface DiskUsage {
    total: number;
    used: number;
    free: number;
    percentage: number;
    topFolders: FolderInfo[];
}
export interface ProcessInfo {
    pid: number;
    name: string;
    memoryUsage: number;
    cpuUsage: number;
    command: string;
}
export interface FolderInfo {
    path: string;
    size: number;
    percentage: number;
}
export interface PM2ProcessInfo {
    name: string;
    pid: number;
    status: string;
    cpu: number;
    memory: number;
    uptime: string;
    restarts: number;
}
export interface MonitorConfig {
    interval: number;
    dbPath?: string;
    enableMemoryMonitoring: boolean;
    enableCpuMonitoring: boolean;
    enableDiskMonitoring: boolean;
    enablePM2Monitoring: boolean;
    maxRecords?: number;
    diskPaths?: string[];
}
export interface DatabaseRecord {
    id?: number;
    timestamp: string;
    type: 'memory' | 'cpu' | 'disk' | 'pm2';
    data: string;
}
//# sourceMappingURL=index.d.ts.map