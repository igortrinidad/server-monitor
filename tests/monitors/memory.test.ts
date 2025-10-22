import { MemoryMonitor } from '../../src/monitors/memory';
import { exec } from 'child_process';
import * as os from 'os';

// Mock dependencies
jest.mock('child_process');
jest.mock('os');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockOs = os as jest.Mocked<typeof os>;

describe('MemoryMonitor', () => {
  let memoryMonitor: MemoryMonitor;

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor();
    jest.clearAllMocks();
  });

  describe('getMemoryUsage', () => {
    beforeEach(() => {
      // Mock OS memory functions
      mockOs.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
      mockOs.freemem.mockReturnValue(4 * 1024 * 1024 * 1024);   // 4GB free
    });

    it('should return correct memory usage calculation', async () => {
      // Mock process list for Unix systems
      mockOs.platform.mockReturnValue('darwin');
      const mockProcessOutput = `  PID COMMAND         %MEM %CPU COMMAND
  1234 node            5.2  10.5 node server.js
  5678 chrome          3.8   2.1 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
  9012 code            2.1   1.8 /Applications/Visual Studio Code.app/Contents/MacOS/Electron`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(null, { stdout: mockProcessOutput });
      });

      const result = await memoryMonitor.getMemoryUsage();

      expect(result).toEqual({
        total: 16 * 1024 * 1024 * 1024,
        used: 12 * 1024 * 1024 * 1024,
        free: 4 * 1024 * 1024 * 1024,
        percentage: 75, // (12GB / 16GB) * 100
        formatted_total: '16 GB',
        formatted_used: '12 GB',
        formatted_free: '4 GB',
        topProcesses: expect.any(Array)
      });
    });

    it('should handle Windows platform', async () => {
      mockOs.platform.mockReturnValue('win32');
      const mockWindowsOutput = `Node,CommandLine,WorkingSetSize,PageFileUsage,ProcessId
SYSTEM,System,1048576,2097152,1234
chrome.exe,chrome.exe,536870912,1073741824,5678`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(null, { stdout: mockWindowsOutput });
      });

      const result = await memoryMonitor.getMemoryUsage();

      expect(result.total).toBe(16 * 1024 * 1024 * 1024);
      expect(result.used).toBe(12 * 1024 * 1024 * 1024);
      expect(result.free).toBe(4 * 1024 * 1024 * 1024);
      expect(result.percentage).toBe(75);
      expect(result.formatted_total).toBe('16 GB');
      expect(result.formatted_used).toBe('12 GB');
      expect(result.formatted_free).toBe('4 GB');
      expect(Array.isArray(result.topProcesses)).toBe(true);
    });

    it('should handle exec command errors gracefully', async () => {
      mockOs.platform.mockReturnValue('darwin');
      
      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(new Error('Command failed'));
      });

      const result = await memoryMonitor.getMemoryUsage();

      expect(result.topProcesses).toEqual([]);
      expect(result.total).toBe(16 * 1024 * 1024 * 1024);
    });

    it('should return empty processes for unsupported platforms', async () => {
      mockOs.platform.mockReturnValue('freebsd' as any);
      
      const result = await memoryMonitor.getMemoryUsage();

      expect(result.topProcesses).toEqual([]);
    });

    it('should limit processes to top 20', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      // Generate mock output with 25 processes
      let mockOutput = '  PID COMMAND         %MEM %CPU COMMAND\n';
      for (let i = 1; i <= 25; i++) {
        mockOutput += `  ${1000 + i} process${i}      ${i}.5  ${i}.0 /usr/bin/process${i}\n`;
      }

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(null, { stdout: mockOutput });
      });

      const result = await memoryMonitor.getMemoryUsage();

      expect(result.topProcesses).toHaveLength(20);
    });

    it('should parse process information correctly', async () => {
      mockOs.platform.mockReturnValue('linux');
      const mockOutput = `  PID COMMAND         %MEM %CPU COMMAND
  1234 node            5.2  10.5 node server.js
  5678 chrome          3.8   2.1 chrome --no-sandbox`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(null, { stdout: mockOutput });
      });

      const result = await memoryMonitor.getMemoryUsage();

      expect(result.topProcesses).toHaveLength(2);
      expect(result.topProcesses[0]).toEqual({
        pid: 1234,
        name: 'node',
        memoryUsage: 5.2,
        cpuUsage: 10.5,
        command: 'node server.js'
      });
      expect(result.topProcesses[1]).toEqual({
        pid: 5678,
        name: 'chrome',
        memoryUsage: 3.8,
        cpuUsage: 2.1,
        command: 'chrome --no-sandbox'
      });
    });
  });
});