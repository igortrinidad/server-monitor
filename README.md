

# @igortrindade/server-monitor

A comprehensive server monitoring package for Node.js applications with SQLite storage support.

## Features

This package helps monitor the health of your server running alongside your Node.js application. The main KPIs the package keeps track of are:

- **MEMORY USAGE** - Total, used, free memory and percentage
- **TOP 20 MEMORY USAGE PROCESSES** - List of processes consuming most memory
- **CPU USAGE** - CPU percentage and load average
- **TOP 20 CPU USAGE PROCESSES** - List of processes consuming most CPU
- **FREE DISK SPACE** - Total, used, free disk space and percentage
- **TOP 20 FOLDERS DISK USAGE** - List of folders consuming most disk space
- **MONITOR PM2 LOGS** - PM2 process monitoring and log access

## Installation

```bash
npm install @igortrindade/server-monitor
```

## Quick Start

```typescript
import { ServerMonitor } from '@igortrindade/server-monitor';

const monitor = new ServerMonitor({
  interval: 60000, // Collect metrics every 60 seconds
  dbPath: './server-metrics.db', // SQLite database path
  enableMemoryMonitoring: true,
  enableCpuMonitoring: true,
  enableDiskMonitoring: true,
  enablePM2Monitoring: true
});

// Event listeners
monitor.on('memoryMetrics', (metrics) => {
  console.log(`Memory usage: ${metrics.percentage.toFixed(2)}%`);
});

monitor.on('error', (error) => {
  console.error('Monitor error:', error);
});

// Start monitoring
await monitor.initialize();
await monitor.start();

// Get current metrics
const currentMemory = await monitor.getMemoryUsage();
const currentCpu = await monitor.getCpuUsage();
const currentDisk = await monitor.getDiskUsage();

// Get historical data
const memoryHistory = await monitor.getHistoricalData('memory', 100);

// Stop monitoring
await monitor.stop();
```

## Configuration Options

```typescript
interface MonitorConfig {
  interval: number;              // Monitoring interval in milliseconds (default: 60000)
  dbPath?: string;              // SQLite database path (default: './server-monitor.db')
  enableMemoryMonitoring: boolean;   // Enable memory monitoring (default: true)
  enableCpuMonitoring: boolean;      // Enable CPU monitoring (default: true)
  enableDiskMonitoring: boolean;     // Enable disk monitoring (default: true)
  enablePM2Monitoring: boolean;      // Enable PM2 monitoring (default: true)
  maxRecords?: number;          // Maximum records to keep (default: 10000)
  diskPaths?: string[];         // Disk paths to monitor (default: ['/'])
}
```

## API Reference

### ServerMonitor Class

#### Constructor
```typescript
new ServerMonitor(config?: Partial<MonitorConfig>)
```

#### Methods

- `initialize(): Promise<void>` - Initialize the monitor and database
- `start(): Promise<void>` - Start monitoring
- `stop(): Promise<void>` - Stop monitoring
- `getMemoryUsage(): Promise<MemoryUsage>` - Get current memory usage
- `getCpuUsage(): Promise<CpuUsage>` - Get current CPU usage
- `getDiskUsage(): Promise<DiskUsage>` - Get current disk usage
- `getPM2Processes(): Promise<PM2ProcessInfo[]>` - Get PM2 processes
- `getPM2Logs(appName?: string, lines?: number): Promise<string>` - Get PM2 logs
- `getHistoricalData(type, limit?, startDate?, endDate?)` - Get historical metrics
- `getLatestMetrics()` - Get latest metrics from database
- `updateConfig(newConfig)` - Update configuration
- `isMonitoringActive(): boolean` - Check if monitoring is active

#### Events

- `initialized` - Emitted when monitor is initialized
- `started` - Emitted when monitoring starts
- `stopped` - Emitted when monitoring stops
- `memoryMetrics` - Emitted when memory metrics are collected
- `cpuMetrics` - Emitted when CPU metrics are collected
- `diskMetrics` - Emitted when disk metrics are collected
- `pm2Metrics` - Emitted when PM2 metrics are collected
- `metricsCollected` - Emitted when all metrics are collected
- `error` - Emitted when an error occurs

## Data Types

### MemoryUsage
```typescript
interface MemoryUsage {
  total: number;        // Total memory in bytes
  used: number;         // Used memory in bytes
  free: number;         // Free memory in bytes
  percentage: number;   // Usage percentage
  topProcesses: ProcessInfo[];
}
```

### CpuUsage
```typescript
interface CpuUsage {
  percentage: number;   // CPU usage percentage
  loadAverage: number[]; // Load average [1min, 5min, 15min]
  topProcesses: ProcessInfo[];
}
```

### DiskUsage
```typescript
interface DiskUsage {
  total: number;        // Total disk space in bytes
  used: number;         // Used disk space in bytes
  free: number;         // Free disk space in bytes
  percentage: number;   // Usage percentage
  topFolders: FolderInfo[];
}
```

### ProcessInfo
```typescript
interface ProcessInfo {
  pid: number;          // Process ID
  name: string;         // Process name
  memoryUsage: number;  // Memory usage (MB or %)
  cpuUsage: number;     // CPU usage percentage
  command: string;      // Full command
}
```

## Database Storage

All metrics are automatically stored in an SQLite database. The database schema includes:

- `id` - Auto-incrementing primary key
- `timestamp` - ISO string timestamp
- `type` - Metric type ('memory', 'cpu', 'disk', 'pm2')
- `data` - JSON stringified metric data

## Cross-Platform Support

This package supports:
- **macOS** - Full support for all monitoring features
- **Linux** - Full support for all monitoring features
- **Windows** - Partial support (some commands may differ)

## Requirements

- Node.js 14.0.0 or higher
- SQLite3
- PM2 (optional, for PM2 monitoring)

## TypeScript Support

This package is written in TypeScript and includes full type definitions. No additional `@types` packages are needed.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT


