import { EventEmitter } from 'events';
import { MemoryMonitor } from './monitors/memory';
import { CpuMonitor } from './monitors/cpu';
import { DiskMonitor } from './monitors/disk';
import { PM2Monitor } from './monitors/pm2';
import { DatabaseManager } from './database/manager';
import { MonitorConfig, SystemMetrics, MemoryUsage, CpuUsage, DiskUsage, PM2ProcessInfo } from './types';

export class ServerMonitor extends EventEmitter {
  private memoryMonitor: MemoryMonitor;
  private cpuMonitor: CpuMonitor;
  private diskMonitor: DiskMonitor;
  private pm2Monitor: PM2Monitor;
  private databaseManager: DatabaseManager;
  private config: MonitorConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: Partial<MonitorConfig> = {}) {
    super();
    
    this.config = {
      interval: 60000, // 1 minute default
      enableMemoryMonitoring: true,
      enableCpuMonitoring: true,
      enableDiskMonitoring: true,
      enablePM2Monitoring: true,
      maxRecords: 10000,
      diskPaths: ['/'],
      ...config
    };

    this.memoryMonitor = new MemoryMonitor();
    this.cpuMonitor = new CpuMonitor();
    this.diskMonitor = new DiskMonitor(this.config.diskPaths);
    this.pm2Monitor = new PM2Monitor();
    this.databaseManager = new DatabaseManager(this.config.dbPath);
  }

  async initialize(): Promise<void> {
    try {
      await this.databaseManager.initialize();
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    if (!this.databaseManager) {
      await this.initialize();
    }

    this.isRunning = true;
    this.emit('started');

    // Collect initial metrics
    await this.collectMetrics();

    // Set up interval for continuous monitoring
    this.intervalId = setInterval(async () => {
      await this.collectMetrics();
    }, this.config.interval);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await this.databaseManager.close();
    this.emit('stopped');
  }

  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date();
      const metrics: Partial<SystemMetrics> = { timestamp };

      if (this.config.enableMemoryMonitoring) {
        const memoryUsage = await this.memoryMonitor.getMemoryUsage();
        metrics.memoryUsage = memoryUsage;
        await this.databaseManager.insertMetric('memory', memoryUsage);
        this.emit('memoryMetrics', memoryUsage);
      }

      if (this.config.enableCpuMonitoring) {
        const cpuUsage = await this.cpuMonitor.getCpuUsage();
        metrics.cpuUsage = cpuUsage;
        await this.databaseManager.insertMetric('cpu', cpuUsage);
        this.emit('cpuMetrics', cpuUsage);
      }

      if (this.config.enableDiskMonitoring) {
        const diskUsage = await this.diskMonitor.getDiskUsage();
        metrics.diskUsage = diskUsage;
        await this.databaseManager.insertMetric('disk', diskUsage);
        this.emit('diskMetrics', diskUsage);
      }

      if (this.config.enablePM2Monitoring) {
        const pm2Processes = await this.pm2Monitor.getPM2Processes();
        if (pm2Processes.length > 0) {
          await this.databaseManager.insertMetric('pm2', pm2Processes);
          this.emit('pm2Metrics', pm2Processes);
        }
      }

      // Clean up old records if needed
      if (this.config.maxRecords) {
        await this.cleanupOldRecords();
      }

      this.emit('metricsCollected', metrics);
    } catch (error) {
      this.emit('error', error);
    }
  }

  private async cleanupOldRecords(): Promise<void> {
    try {
      const totalRecords = await this.databaseManager.getMetricsCount();
      if (totalRecords > this.config.maxRecords!) {
        const recordsToDelete = totalRecords - this.config.maxRecords!;
        const daysToKeep = Math.max(1, Math.floor(this.config.maxRecords! / (24 * 60 * 60 * 1000 / this.config.interval)));
        await this.databaseManager.deleteOldMetrics(daysToKeep);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  // Public API methods for retrieving data
  async getMemoryUsage(): Promise<MemoryUsage> {
    return this.memoryMonitor.getMemoryUsage();
  }

  async getCpuUsage(): Promise<CpuUsage> {
    return this.cpuMonitor.getCpuUsage();
  }

  async getDiskUsage(): Promise<DiskUsage> {
    return this.diskMonitor.getDiskUsage();
  }

  async getPM2Processes(): Promise<PM2ProcessInfo[]> {
    return this.pm2Monitor.getPM2Processes();
  }

  async getPM2Logs(appName?: string, lines: number = 100): Promise<string> {
    return this.pm2Monitor.getPM2Logs(appName, lines);
  }

  async getHistoricalData(
    type: 'memory' | 'cpu' | 'disk' | 'pm2',
    limit?: number,
    startDate?: Date,
    endDate?: Date
  ) {
    const records = await this.databaseManager.getMetrics(type, limit, startDate, endDate);
    return records.map(record => ({
      timestamp: new Date(record.timestamp),
      data: JSON.parse(record.data)
    }));
  }

  async getLatestMetrics() {
    const [memory, cpu, disk, pm2] = await Promise.all([
      this.databaseManager.getLatestMetric('memory'),
      this.databaseManager.getLatestMetric('cpu'),
      this.databaseManager.getLatestMetric('disk'),
      this.databaseManager.getLatestMetric('pm2')
    ]);

    return {
      memory: memory ? JSON.parse(memory.data) : null,
      cpu: cpu ? JSON.parse(cpu.data) : null,
      disk: disk ? JSON.parse(disk.data) : null,
      pm2: pm2 ? JSON.parse(pm2.data) : null
    };
  }

  getConfig(): MonitorConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isRunning) {
      // Restart with new configuration
      this.stop().then(() => this.start());
    }
  }

  isMonitoringActive(): boolean {
    return this.isRunning;
  }
}