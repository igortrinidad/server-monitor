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
  interval: number; // in milliseconds
  dbPath?: string;
  enableMemoryMonitoring: boolean;
  enableCpuMonitoring: boolean;
  enableDiskMonitoring: boolean;
  enablePM2Monitoring: boolean;
  maxRecords?: number; // maximum records to keep in database
  diskPaths?: string[]; // paths to monitor for disk usage
}

export interface DatabaseRecord {
  id?: number;
  timestamp: string;
  type: 'memory' | 'cpu' | 'disk' | 'pm2';
  data: string; // JSON stringified data
}