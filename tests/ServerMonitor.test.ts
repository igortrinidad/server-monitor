import { ServerMonitor } from '../../src/ServerMonitor';
import { MemoryMonitor } from '../../src/monitors/memory';
import { CpuMonitor } from '../../src/monitors/cpu';
import { DiskMonitor } from '../../src/monitors/disk';
import { PM2Monitor } from '../../src/monitors/pm2';
import { DatabaseManager } from '../../src/database/manager';
import * as fs from 'fs';
import * as path from 'path';

// Mock all monitor classes
jest.mock('../../src/monitors/memory');
jest.mock('../../src/monitors/cpu');
jest.mock('../../src/monitors/disk');
jest.mock('../../src/monitors/pm2');
jest.mock('../../src/database/manager');

const MockedMemoryMonitor = MemoryMonitor as jest.MockedClass<typeof MemoryMonitor>;
const MockedCpuMonitor = CpuMonitor as jest.MockedClass<typeof CpuMonitor>;
const MockedDiskMonitor = DiskMonitor as jest.MockedClass<typeof DiskMonitor>;
const MockedPM2Monitor = PM2Monitor as jest.MockedClass<typeof PM2Monitor>;
const MockedDatabaseManager = DatabaseManager as jest.MockedClass<typeof DatabaseManager>;

describe('ServerMonitor Integration Tests', () => {
  let serverMonitor: ServerMonitor;
  let testDbPath: string;

  // Mock instances
  let mockMemoryMonitor: jest.Mocked<MemoryMonitor>;
  let mockCpuMonitor: jest.Mocked<CpuMonitor>;
  let mockDiskMonitor: jest.Mocked<DiskMonitor>;
  let mockPM2Monitor: jest.Mocked<PM2Monitor>;
  let mockDatabaseManager: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    testDbPath = path.join(process.cwd(), 'test-server-monitor-' + Date.now() + '.db');

    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock instances
    mockMemoryMonitor = {
      getMemoryUsage: jest.fn()
    } as any;

    mockCpuMonitor = {
      getCpuUsage: jest.fn()
    } as any;

    mockDiskMonitor = {
      getDiskUsage: jest.fn()
    } as any;

    mockPM2Monitor = {
      getPM2Processes: jest.fn(),
      getPM2Logs: jest.fn()
    } as any;

    mockDatabaseManager = {
      initialize: jest.fn(),
      insertMetric: jest.fn(),
      getMetrics: jest.fn(),
      getLatestMetric: jest.fn(),
      getMetricsCount: jest.fn(),
      deleteOldMetrics: jest.fn(),
      close: jest.fn()
    } as any;

    // Configure mocks to return instances
    MockedMemoryMonitor.mockImplementation(() => mockMemoryMonitor);
    MockedCpuMonitor.mockImplementation(() => mockCpuMonitor);
    MockedDiskMonitor.mockImplementation(() => mockDiskMonitor);
    MockedPM2Monitor.mockImplementation(() => mockPM2Monitor);
    MockedDatabaseManager.mockImplementation(() => mockDatabaseManager);

    // Setup default mock return values
    mockMemoryMonitor.getMemoryUsage.mockResolvedValue({
      total: 16 * 1024 * 1024 * 1024,
      used: 12 * 1024 * 1024 * 1024,
      free: 4 * 1024 * 1024 * 1024,
      percentage: 75,
      topProcesses: []
    });

    mockCpuMonitor.getCpuUsage.mockResolvedValue({
      percentage: 25.5,
      loadAverage: [1.5, 2.0, 1.8],
      topProcesses: []
    });

    mockDiskMonitor.getDiskUsage.mockResolvedValue({
      total: 500 * 1024 * 1024 * 1024,
      used: 350 * 1024 * 1024 * 1024,
      free: 150 * 1024 * 1024 * 1024,
      percentage: 70,
      topFolders: []
    });

    mockPM2Monitor.getPM2Processes.mockResolvedValue([]);
    mockPM2Monitor.getPM2Logs.mockResolvedValue('mock pm2 logs');

    mockDatabaseManager.initialize.mockResolvedValue();
    mockDatabaseManager.insertMetric.mockResolvedValue(1);
    mockDatabaseManager.close.mockResolvedValue();
    mockDatabaseManager.getMetricsCount.mockResolvedValue(0);

    serverMonitor = new ServerMonitor({
      dbPath: testDbPath,
      interval: 100, // Fast interval for testing
      enableMemoryMonitoring: true,
      enableCpuMonitoring: true,
      enableDiskMonitoring: true,
      enablePM2Monitoring: true
    });
  });

  afterEach(async () => {
    if (serverMonitor.isMonitoringActive()) {
      await serverMonitor.stop();
    }

    // Clean up test database file
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should initialize successfully with default configuration', async () => {
      const defaultMonitor = new ServerMonitor();
      
      await defaultMonitor.initialize();
      
      expect(mockDatabaseManager.initialize).toHaveBeenCalled();
      
      await defaultMonitor.stop();
    });

    it('should initialize with custom configuration', async () => {
      const customConfig = {
        interval: 5000,
        enableMemoryMonitoring: false,
        enableCpuMonitoring: true,
        enableDiskMonitoring: false,
        enablePM2Monitoring: true,
        maxRecords: 5000,
        diskPaths: ['/home', '/var']
      };

      const customMonitor = new ServerMonitor(customConfig);
      
      expect(MockedDiskMonitor).toHaveBeenCalledWith(['/home', '/var']);
      
      const config = customMonitor.getConfig();
      expect(config.interval).toBe(5000);
      expect(config.enableMemoryMonitoring).toBe(false);
      expect(config.maxRecords).toBe(5000);
    });

    it('should emit initialized event', async () => {
      const initializePromise = new Promise<void>((resolve) => {
        serverMonitor.on('initialized', resolve);
      });

      await serverMonitor.initialize();
      await initializePromise;

      expect(mockDatabaseManager.initialize).toHaveBeenCalled();
    });

    it('should emit error event on initialization failure', async () => {
      mockDatabaseManager.initialize.mockRejectedValue(new Error('Database error'));

      const errorPromise = new Promise<Error>((resolve) => {
        serverMonitor.on('error', resolve);
      });

      await expect(serverMonitor.initialize()).rejects.toThrow('Database error');
      
      const error = await errorPromise;
      expect(error.message).toBe('Database error');
    });
  });

  describe('monitoring lifecycle', () => {
    beforeEach(async () => {
      await serverMonitor.initialize();
    });

    it('should start and stop monitoring successfully', async () => {
      expect(serverMonitor.isMonitoringActive()).toBe(false);

      const startedPromise = new Promise<void>((resolve) => {
        serverMonitor.on('started', resolve);
      });

      await serverMonitor.start();
      await startedPromise;

      expect(serverMonitor.isMonitoringActive()).toBe(true);

      const stoppedPromise = new Promise<void>((resolve) => {
        serverMonitor.on('stopped', resolve);
      });

      await serverMonitor.stop();
      await stoppedPromise;

      expect(serverMonitor.isMonitoringActive()).toBe(false);
      expect(mockDatabaseManager.close).toHaveBeenCalled();
    });

    it('should not start if already running', async () => {
      await serverMonitor.start();
      
      const initialCallCount = mockDatabaseManager.insertMetric.mock.calls.length;
      
      // Try to start again
      await serverMonitor.start();
      
      // Should not have made additional database calls
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockDatabaseManager.insertMetric.mock.calls.length).toBe(initialCallCount);
      
      await serverMonitor.stop();
    });

    it('should not stop if not running', async () => {
      await serverMonitor.stop();
      
      expect(mockDatabaseManager.close).toHaveBeenCalled();
    });
  });

  describe('metrics collection', () => {
    beforeEach(async () => {
      await serverMonitor.initialize();
    });

    it('should collect all enabled metrics', async () => {
      const metricsPromise = new Promise<void>((resolve) => {
        serverMonitor.on('metricsCollected', resolve);
      });

      await serverMonitor.start();
      await metricsPromise;

      expect(mockMemoryMonitor.getMemoryUsage).toHaveBeenCalled();
      expect(mockCpuMonitor.getCpuUsage).toHaveBeenCalled();
      expect(mockDiskMonitor.getDiskUsage).toHaveBeenCalled();
      expect(mockPM2Monitor.getPM2Processes).toHaveBeenCalled();

      expect(mockDatabaseManager.insertMetric).toHaveBeenCalledWith('memory', expect.any(Object));
      expect(mockDatabaseManager.insertMetric).toHaveBeenCalledWith('cpu', expect.any(Object));
      expect(mockDatabaseManager.insertMetric).toHaveBeenCalledWith('disk', expect.any(Object));

      await serverMonitor.stop();
    });

    it('should emit specific metric events', async () => {
      const memoryPromise = new Promise<any>((resolve) => {
        serverMonitor.on('memoryMetrics', resolve);
      });

      const cpuPromise = new Promise<any>((resolve) => {
        serverMonitor.on('cpuMetrics', resolve);
      });

      await serverMonitor.start();

      const [memoryMetrics, cpuMetrics] = await Promise.all([memoryPromise, cpuPromise]);

      expect(memoryMetrics.percentage).toBe(75);
      expect(cpuMetrics.percentage).toBe(25.5);

      await serverMonitor.stop();
    });

    it('should only collect enabled metrics', async () => {
      const selectiveMonitor = new ServerMonitor({
        dbPath: testDbPath,
        interval: 100,
        enableMemoryMonitoring: true,
        enableCpuMonitoring: false,
        enableDiskMonitoring: true,
        enablePM2Monitoring: false
      });

      await selectiveMonitor.initialize();

      const metricsPromise = new Promise<void>((resolve) => {
        selectiveMonitor.on('metricsCollected', resolve);
      });

      await selectiveMonitor.start();
      await metricsPromise;

      expect(mockMemoryMonitor.getMemoryUsage).toHaveBeenCalled();
      expect(mockCpuMonitor.getCpuUsage).not.toHaveBeenCalled();
      expect(mockDiskMonitor.getDiskUsage).toHaveBeenCalled();
      expect(mockPM2Monitor.getPM2Processes).not.toHaveBeenCalled();

      await selectiveMonitor.stop();
    });

    it('should handle PM2 monitoring when processes exist', async () => {
      mockPM2Monitor.getPM2Processes.mockResolvedValue([
        {
          name: 'app1',
          pid: 1234,
          status: 'online',
          cpu: 15.5,
          memory: 134217728,
          uptime: '1h 30m',
          restarts: 0
        }
      ]);

      const pm2Promise = new Promise<any>((resolve) => {
        serverMonitor.on('pm2Metrics', resolve);
      });

      await serverMonitor.start();
      const pm2Metrics = await pm2Promise;

      expect(pm2Metrics).toHaveLength(1);
      expect(pm2Metrics[0].name).toBe('app1');
      expect(mockDatabaseManager.insertMetric).toHaveBeenCalledWith('pm2', expect.any(Array));

      await serverMonitor.stop();
    });

    it('should handle errors in metric collection gracefully', async () => {
      mockMemoryMonitor.getMemoryUsage.mockRejectedValue(new Error('Memory error'));

      const errorPromise = new Promise<Error>((resolve) => {
        serverMonitor.on('error', resolve);
      });

      await serverMonitor.start();
      const error = await errorPromise;

      expect(error.message).toBe('Memory error');

      await serverMonitor.stop();
    });
  });

  describe('public API methods', () => {
    beforeEach(async () => {
      await serverMonitor.initialize();
    });

    it('should provide direct access to current metrics', async () => {
      const memoryUsage = await serverMonitor.getMemoryUsage();
      const cpuUsage = await serverMonitor.getCpuUsage();
      const diskUsage = await serverMonitor.getDiskUsage();
      const pm2Processes = await serverMonitor.getPM2Processes();

      expect(memoryUsage.percentage).toBe(75);
      expect(cpuUsage.percentage).toBe(25.5);
      expect(diskUsage.percentage).toBe(70);
      expect(Array.isArray(pm2Processes)).toBe(true);
    });

    it('should provide PM2 logs access', async () => {
      const logs = await serverMonitor.getPM2Logs('myapp', 50);
      
      expect(logs).toBe('mock pm2 logs');
      expect(mockPM2Monitor.getPM2Logs).toHaveBeenCalledWith('myapp', 50);
    });

    it('should provide historical data access', async () => {
      mockDatabaseManager.getMetrics.mockResolvedValue([
        {
          id: 1,
          timestamp: '2023-10-22T10:00:00.000Z',
          type: 'memory',
          data: JSON.stringify({ percentage: 80 })
        }
      ]);

      const history = await serverMonitor.getHistoricalData('memory', 10);

      expect(history).toHaveLength(1);
      expect(history[0].data.percentage).toBe(80);
      expect(mockDatabaseManager.getMetrics).toHaveBeenCalledWith('memory', 10, undefined, undefined);
    });

    it('should provide latest metrics summary', async () => {
      mockDatabaseManager.getLatestMetric
        .mockResolvedValueOnce({
          id: 1,
          timestamp: '2023-10-22T10:00:00.000Z',
          type: 'memory',
          data: JSON.stringify({ percentage: 75 })
        })
        .mockResolvedValueOnce({
          id: 2,
          timestamp: '2023-10-22T10:00:00.000Z',
          type: 'cpu',
          data: JSON.stringify({ percentage: 25 })
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const latestMetrics = await serverMonitor.getLatestMetrics();

      expect(latestMetrics).toEqual({
        memory: { percentage: 75 },
        cpu: { percentage: 25 },
        disk: null,
        pm2: null
      });
    });
  });

  describe('configuration management', () => {
    it('should return current configuration', () => {
      const config = serverMonitor.getConfig();
      
      expect(config.interval).toBe(100);
      expect(config.enableMemoryMonitoring).toBe(true);
      expect(config.dbPath).toBe(testDbPath);
    });

    it('should update configuration', async () => {
      await serverMonitor.initialize();
      
      const newConfig = {
        interval: 200,
        enableMemoryMonitoring: false
      };

      serverMonitor.updateConfig(newConfig);

      const updatedConfig = serverMonitor.getConfig();
      expect(updatedConfig.interval).toBe(200);
      expect(updatedConfig.enableMemoryMonitoring).toBe(false);
    });

    it('should restart monitoring when configuration is updated while running', async () => {
      await serverMonitor.initialize();
      await serverMonitor.start();

      const stopSpy = jest.spyOn(serverMonitor, 'stop');
      const startSpy = jest.spyOn(serverMonitor, 'start');

      serverMonitor.updateConfig({ interval: 200 });

      expect(stopSpy).toHaveBeenCalled();
      
      // Wait for restart to complete
      await new Promise(resolve => setTimeout(resolve, 50));
    });
  });

  describe('cleanup and resource management', () => {
    beforeEach(async () => {
      await serverMonitor.initialize();
    });

    it('should clean up old records when maxRecords is exceeded', async () => {
      mockDatabaseManager.getMetricsCount.mockResolvedValue(15000);
      
      const metricsPromise = new Promise<void>((resolve) => {
        serverMonitor.on('metricsCollected', resolve);
      });

      await serverMonitor.start();
      await metricsPromise;

      expect(mockDatabaseManager.deleteOldMetrics).toHaveBeenCalled();

      await serverMonitor.stop();
    });

    it('should not clean up records when under maxRecords limit', async () => {
      mockDatabaseManager.getMetricsCount.mockResolvedValue(5000);
      
      const metricsPromise = new Promise<void>((resolve) => {
        serverMonitor.on('metricsCollected', resolve);
      });

      await serverMonitor.start();
      await metricsPromise;

      expect(mockDatabaseManager.deleteOldMetrics).not.toHaveBeenCalled();

      await serverMonitor.stop();
    });
  });
});