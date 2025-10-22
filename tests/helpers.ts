// Test utilities and helpers

/**
 * Creates a mock process output for Unix systems
 */
export function createMockUnixProcessOutput(processes: Array<{
  pid: number;
  command: string;
  cpu: number;
  memory: number;
  fullCommand: string;
}>): string {
  let output = '  PID COMMAND         %CPU %MEM COMMAND\n';
  
  processes.forEach(proc => {
    output += `  ${proc.pid} ${proc.command.padEnd(15)} ${proc.cpu.toFixed(1).padStart(4)} ${proc.memory.toFixed(1).padStart(4)} ${proc.fullCommand}\n`;
  });
  
  return output;
}

/**
 * Creates a mock disk usage output for Unix systems
 */
export function createMockUnixDiskOutput(
  filesystem: string,
  size: string,
  used: string,
  available: string,
  usePercent: string,
  mountPoint: string
): string {
  return `Filesystem     Size  Used Avail Use% Mounted on\n${filesystem.padEnd(14)} ${size.padStart(4)}  ${used.padStart(4)} ${available.padStart(5)}  ${usePercent.padStart(3)} ${mountPoint}`;
}

/**
 * Creates a mock folder usage output for Unix systems
 */
export function createMockUnixFolderOutput(folders: Array<{
  size: string;
  path: string;
}>): string {
  return folders.map(folder => `${folder.size}\t${folder.path}`).join('\n');
}

/**
 * Creates a mock PM2 process list
 */
export function createMockPM2Processes(processes: Array<{
  name: string;
  pid?: number;
  status?: string;
  cpu?: number;
  memory?: number;
  uptime?: number;
  restarts?: number;
}>): string {
  const mockProcesses = processes.map(proc => ({
    name: proc.name,
    pid: proc.pid || 0,
    pm2_env: {
      status: proc.status || 'online',
      pm_uptime: proc.uptime || Date.now(),
      restart_time: proc.restarts || 0
    },
    monit: {
      cpu: proc.cpu || 0,
      memory: proc.memory || 0
    }
  }));
  
  return JSON.stringify(mockProcesses);
}

/**
 * Waits for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a temporary database path for testing
 */
export function createTestDbPath(testName: string): string {
  return `./test-${testName}-${Date.now()}.db`;
}

/**
 * Mock event emitter for testing event-driven behavior
 */
export class MockEventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, ...args: any[]): void {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  removeAllListeners(): void {
    this.events = {};
  }
}

/**
 * Common test data for metrics
 */
export const TEST_METRICS = {
  memory: {
    total: 16 * 1024 * 1024 * 1024, // 16GB
    used: 12 * 1024 * 1024 * 1024,  // 12GB
    free: 4 * 1024 * 1024 * 1024,   // 4GB
    percentage: 75,
    topProcesses: [
      {
        pid: 1234,
        name: 'node',
        memoryUsage: 5.2,
        cpuUsage: 10.5,
        command: 'node server.js'
      }
    ]
  },
  cpu: {
    percentage: 25.5,
    loadAverage: [1.5, 2.0, 1.8],
    topProcesses: [
      {
        pid: 1234,
        name: 'node',
        memoryUsage: 5.2,
        cpuUsage: 15.2,
        command: 'node server.js'
      }
    ]
  },
  disk: {
    total: 500 * 1024 * 1024 * 1024, // 500GB
    used: 350 * 1024 * 1024 * 1024,  // 350GB
    free: 150 * 1024 * 1024 * 1024,  // 150GB
    percentage: 70,
    topFolders: [
      {
        path: '/System',
        size: 100 * 1024 * 1024 * 1024, // 100GB
        percentage: 20
      }
    ]
  },
  pm2: [
    {
      name: 'app1',
      pid: 1234,
      status: 'online' as const,
      cpu: 15.5,
      memory: 134217728, // 128MB
      uptime: '1h 30m',
      restarts: 0
    }
  ]
};

/**
 * Asserts that a value is within a certain range
 */
export function expectToBeWithinRange(actual: number, min: number, max: number): void {
  expect(actual).toBeGreaterThanOrEqual(min);
  expect(actual).toBeLessThanOrEqual(max);
}