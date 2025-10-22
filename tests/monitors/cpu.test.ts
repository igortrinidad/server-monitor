import { CpuMonitor } from '../../src/monitors/cpu';
import { exec } from 'child_process';
import * as os from 'os';

// Mock dependencies
jest.mock('child_process');
jest.mock('os');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockOs = os as jest.Mocked<typeof os>;

describe('CpuMonitor', () => {
  let cpuMonitor: CpuMonitor;

  beforeEach(() => {
    cpuMonitor = new CpuMonitor();
    jest.clearAllMocks();
  });

  describe('getCpuUsage', () => {
    beforeEach(() => {
      // Mock OS CPU functions
      mockOs.loadavg.mockReturnValue([1.5, 2.0, 1.8]);
      mockOs.cpus.mockReturnValue([
        {
          model: 'Intel Core i7',
          speed: 2800,
          times: {
            user: 1000000,
            nice: 50000,
            sys: 500000,
            idle: 8000000,
            irq: 25000
          }
        },
        {
          model: 'Intel Core i7',
          speed: 2800,
          times: {
            user: 1200000,
            nice: 60000,
            sys: 600000,
            idle: 7500000,
            irq: 30000
          }
        }
      ] as os.CpuInfo[]);
    });

    it('should return correct CPU usage calculation', async () => {
      mockOs.platform.mockReturnValue('darwin');
      const mockProcessOutput = `  PID COMMAND         %CPU %MEM COMMAND
  1234 node            15.2  5.1 node server.js
  5678 chrome          8.5   3.8 chrome --no-sandbox
  9012 code            3.2   2.1 code --no-sandbox`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(null, { stdout: mockProcessOutput });
      });

      const result = await cpuMonitor.getCpuUsage();

      expect(result).toEqual({
        percentage: expect.any(Number),
        loadAverage: [1.5, 2.0, 1.8],
        topProcesses: expect.arrayContaining([
          expect.objectContaining({
            pid: 1234,
            name: 'node',
            cpuUsage: 15.2,
            memoryUsage: 5.1,
            command: 'node server.js'
          })
        ])
      });
    });

    it('should calculate CPU percentage correctly on subsequent calls', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(null, { stdout: 'PID COMMAND %CPU %MEM COMMAND\n' });
      });

      // First call should return 0 (no previous data)
      const firstResult = await cpuMonitor.getCpuUsage();
      expect(firstResult.percentage).toBe(0);

      // Mock different CPU times for second call
      mockOs.cpus.mockReturnValue([
        {
          model: 'Intel Core i7',
          speed: 2800,
          times: {
            user: 1100000,
            nice: 55000,
            sys: 550000,
            idle: 8200000,
            irq: 28000
          }
        },
        {
          model: 'Intel Core i7',
          speed: 2800,
          times: {
            user: 1300000,
            nice: 65000,
            sys: 650000,
            idle: 7700000,
            irq: 35000
          }
        }
      ] as os.CpuInfo[]);

      // Second call should return calculated percentage
      const secondResult = await cpuMonitor.getCpuUsage();
      expect(secondResult.percentage).toBeGreaterThan(0);
    });

    it('should handle Windows platform', async () => {
      mockOs.platform.mockReturnValue('win32');
      const mockWindowsOutput = `Node,CommandLine,WorkingSetSize,PageFileUsage,ProcessId
node.exe,node server.js,536870912,1073741824,1234
chrome.exe,chrome.exe,1073741824,2147483648,5678`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(null, { stdout: mockWindowsOutput });
      });

      const result = await cpuMonitor.getCpuUsage();

      expect(result.loadAverage).toEqual([1.5, 2.0, 1.8]);
      expect(Array.isArray(result.topProcesses)).toBe(true);
    });

    it('should handle exec command errors gracefully', async () => {
      mockOs.platform.mockReturnValue('darwin');
      
      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(new Error('Command failed'));
      });

      const result = await cpuMonitor.getCpuUsage();

      expect(result.topProcesses).toEqual([]);
      expect(result.loadAverage).toEqual([1.5, 2.0, 1.8]);
    });

    it('should return empty processes for unsupported platforms', async () => {
      mockOs.platform.mockReturnValue('aix' as any);
      
      const result = await cpuMonitor.getCpuUsage();

      expect(result.topProcesses).toEqual([]);
    });

    it('should limit processes to top 20', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      // Generate mock output with 25 processes
      let mockOutput = '  PID COMMAND         %CPU %MEM COMMAND\n';
      for (let i = 1; i <= 25; i++) {
        mockOutput += `  ${1000 + i} process${i}      ${i}.5  ${i}.0 /usr/bin/process${i}\n`;
      }

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(null, { stdout: mockOutput });
      });

      const result = await cpuMonitor.getCpuUsage();

      expect(result.topProcesses).toHaveLength(20);
    });

    it('should parse Unix process information correctly', async () => {
      mockOs.platform.mockReturnValue('linux');
      const mockOutput = `  PID COMMAND         %CPU %MEM COMMAND
  1234 node            15.2  5.1 node server.js
  5678 chrome          8.5   3.8 chrome --no-sandbox`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(null, { stdout: mockOutput });
      });

      const result = await cpuMonitor.getCpuUsage();

      expect(result.topProcesses).toHaveLength(2);
      expect(result.topProcesses[0]).toEqual({
        pid: 1234,
        name: 'node',
        memoryUsage: 5.1,
        cpuUsage: 15.2,
        command: 'node server.js'
      });
    });

    it('should handle malformed process output', async () => {
      mockOs.platform.mockReturnValue('linux');
      const mockOutput = `  PID COMMAND         %CPU %MEM COMMAND
  invalid_line_format
  1234 node            abc  def invalid_numbers`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(null, { stdout: mockOutput });
      });

      const result = await cpuMonitor.getCpuUsage();

      expect(result.topProcesses).toHaveLength(1);
      expect(result.topProcesses[0]).toEqual({
        pid: 1234,
        name: 'node',
        memoryUsage: 0, // Should default to 0 for invalid numbers
        cpuUsage: 0,
        command: 'invalid_numbers'
      });
    });
  });
});