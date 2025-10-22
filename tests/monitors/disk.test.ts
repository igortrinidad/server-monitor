import { DiskMonitor } from '../../src/monitors/disk';
import { exec } from 'child_process';
import * as os from 'os';
import { promisify } from 'util';

// Mock dependencies
jest.mock('child_process');
jest.mock('os');
jest.mock('util');

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockOs = os as jest.Mocked<typeof os>;
const mockPromisify = promisify as jest.MockedFunction<typeof promisify>;

describe('DiskMonitor', () => {
  let diskMonitor: DiskMonitor;
  let mockExecAsync: jest.MockedFunction<any>;

  beforeEach(() => {
    diskMonitor = new DiskMonitor(['/']);
    
    // Mock execAsync function
    mockExecAsync = jest.fn();
    mockPromisify.mockReturnValue(mockExecAsync);
    
    jest.clearAllMocks();
  });

  describe('getDiskUsage', () => {
    it('should return correct disk usage for Unix systems', async () => {
      mockOs.platform.mockReturnValue('darwin');
      
      // Mock df command output
      const mockDfOutput = '/dev/disk1s1   500Gi  350Gi  150Gi  70% /';
      
      mockExecAsync.mockResolvedValue({ stdout: mockDfOutput });

      const result = await diskMonitor.getDiskUsage();

      expect(result.total).toBeGreaterThan(0);
      expect(result.used).toBeGreaterThan(0);
      expect(result.free).toBeGreaterThan(0);
      expect(result.percentage).toBeGreaterThan(0);
      expect(result.topFolders).toHaveLength(5); // Mock folders for macOS
      expect(result.topFolders[0].path).toBe('/System');
    });

    it('should return correct disk usage for Windows systems', async () => {
      mockOs.platform.mockReturnValue('win32');
      
      // Mock wmic command output
      const mockWmicOutput = \`FreeSpace=161061273600

Size=500107862016\`;

      mockExecAsync.mockResolvedValue({ stdout: mockWmicOutput });

      const result = await diskMonitor.getDiskUsage();

      expect(result.total).toBe(500107862016);
      expect(result.free).toBe(161061273600);
      expect(result.used).toBe(500107862016 - 161061273600);
      expect(result.percentage).toBeCloseTo(67.8, 1);
    });

    it('should handle exec command errors gracefully', async () => {
      mockOs.platform.mockReturnValue('darwin');
      
      mockExecAsync.mockRejectedValue(new Error('Command failed'));

      const result = await diskMonitor.getDiskUsage();

      expect(result).toEqual({
        total: 0,
        used: 0,
        free: 0,
        percentage: NaN, // 0/0 = NaN
        topFolders: []
      });
    });

    it('should parse size strings correctly', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      const mockDfOutput = '/dev/sda1      1536Gi  819Gi  717Gi  53% /';
      mockExecAsync.mockResolvedValue({ stdout: mockDfOutput });

      const result = await diskMonitor.getDiskUsage();

      // Check that sizes were parsed correctly (Gi = GiB)
      expect(result.total).toBeCloseTo(1536 * 1024 * 1024 * 1024, -6); // 1536GiB
      expect(result.used).toBeCloseTo(819 * 1024 * 1024 * 1024, -6); // 819GiB
      expect(result.free).toBeCloseTo(717 * 1024 * 1024 * 1024, -6); // 717GiB
    });

    it('should return empty folders for unsupported platforms', async () => {
      mockOs.platform.mockReturnValue('sunos' as any);
      
      mockExecAsync.mockRejectedValue(new Error('Platform not supported'));

      const result = await diskMonitor.getDiskUsage();

      expect(result.topFolders).toEqual([]);
    });

    it('should handle malformed df output', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      const mockDfOutput = 'Malformed output without proper columns';
      mockExecAsync.mockResolvedValue({ stdout: mockDfOutput });

      const result = await diskMonitor.getDiskUsage();

      expect(result.total).toBe(0);
      expect(result.used).toBe(0);
      expect(result.free).toBe(0);
    });

    it('should handle custom disk paths', () => {
      const customDiskMonitor = new DiskMonitor(['/home', '/var']);
      expect(customDiskMonitor).toBeInstanceOf(DiskMonitor);
    });
  });

  describe('parseSize', () => {
    it('should parse size strings correctly', () => {
      // Access private method for testing
      const parseSize = (diskMonitor as any).parseSize.bind(diskMonitor);
      
      expect(parseSize('100G')).toBe(107374182400); // 100 * 1024^3
      expect(parseSize('100Gi')).toBe(107374182400); // 100 * 1024^3
      expect(parseSize('1.5T')).toBe(1649267441664); // 1.5 * 1024^4
      expect(parseSize('500M')).toBe(524288000); // 500 * 1024^2
      expect(parseSize('2K')).toBe(2048); // 2 * 1024
      expect(parseSize('100')).toBe(100); // bytes
      expect(parseSize('invalid')).toBe(0);
    });
  });
});
