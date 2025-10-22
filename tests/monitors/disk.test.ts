// Mock child_process
const mockExecAsync = jest.fn();
jest.mock('child_process');
jest.mock('util', () => ({
  promisify: () => mockExecAsync
}));

// Mock os
jest.mock('os');

import { DiskMonitor } from '../../src/monitors/disk';
import * as os from 'os';

const mockOs = os as jest.Mocked<typeof os>;

describe('DiskMonitor', () => {
  let diskMonitor: DiskMonitor;

  beforeEach(() => {
    diskMonitor = new DiskMonitor(['/']);
    jest.clearAllMocks();
  });

  describe('getDiskUsage', () => {
    it('should return correct disk usage for Unix systems', async () => {
      mockOs.platform.mockReturnValue('darwin');
      
      // Mock df -B1 command output (returns bytes)
      const mockDfOutput = '/dev/disk1s1 536870912000 375809638400 161061273600 70% /';
      
      mockExecAsync.mockResolvedValue({ stdout: mockDfOutput });

      const result = await diskMonitor.getDiskUsage();

      expect(result.total).toBe(536870912000);
      expect(result.used).toBe(375809638400);
      expect(result.free).toBe(161061273600);
      expect(result.percentage).toBeCloseTo(70, 1);
      expect(result.formatted_total).toBe('500 GB');
      expect(result.formatted_used).toBe('350 GB');
      expect(result.formatted_free).toBe('150 GB');
      expect(result).not.toHaveProperty('topFolders');
    });

    it('should return correct disk usage for Windows systems', async () => {
      mockOs.platform.mockReturnValue('win32');
      
      // Mock wmic command output
      const mockWmicOutput = `FreeSpace=161061273600

Size=500107862016`;

      mockExecAsync.mockResolvedValue({ stdout: mockWmicOutput });

      const result = await diskMonitor.getDiskUsage();

      expect(result.total).toBe(500107862016);
      expect(result.free).toBe(161061273600);
      expect(result.used).toBe(500107862016 - 161061273600);
      expect(result.percentage).toBeCloseTo(67.8, 1);
      expect(result.formatted_total).toBe('465.76 GB');
      expect(result.formatted_used).toBe('315.76 GB');
      expect(result.formatted_free).toBe('150 GB');
      expect(result).not.toHaveProperty('topFolders');
    });

    it('should handle exec command errors gracefully', async () => {
      mockOs.platform.mockReturnValue('darwin');
      
      mockExecAsync.mockRejectedValue(new Error('Command failed'));

      const result = await diskMonitor.getDiskUsage();

      expect(result).toEqual({
        total: 0,
        used: 0,
        free: 0,
        percentage: 0,
        formatted_total: '0 Bytes',
        formatted_used: '0 Bytes',
        formatted_free: '0 Bytes'
      });
    });

    it('should handle zero division gracefully', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      const mockDfOutput = '/dev/sda1 0 0 0 0% /';
      mockExecAsync.mockResolvedValue({ stdout: mockDfOutput });

      const result = await diskMonitor.getDiskUsage();

      expect(result.total).toBe(0);
      expect(result.used).toBe(0);
      expect(result.free).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should parse byte values correctly from df -B1', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      // Mock df -B1 output with byte values
      const mockDfOutput = '/dev/sda1 1073741824000 536870912000 536870912000 50% /';
      mockExecAsync.mockResolvedValue({ stdout: mockDfOutput });

      const result = await diskMonitor.getDiskUsage();

      expect(result.total).toBe(1073741824000); // 1TB
      expect(result.used).toBe(536870912000); // 500GB
      expect(result.free).toBe(536870912000); // 500GB
      expect(result.percentage).toBe(50);
      expect(result.formatted_total).toBe('1000 GB');
      expect(result.formatted_used).toBe('500 GB');
      expect(result.formatted_free).toBe('500 GB');
    });

    it('should handle malformed df output', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      const mockDfOutput = 'Malformed output without proper columns';
      mockExecAsync.mockResolvedValue({ stdout: mockDfOutput });

      const result = await diskMonitor.getDiskUsage();

      expect(result.total).toBe(0);
      expect(result.used).toBe(0);
      expect(result.free).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should handle custom disk paths', () => {
      const customDiskMonitor = new DiskMonitor(['/home', '/var']);
      expect(customDiskMonitor).toBeInstanceOf(DiskMonitor);
    });

    it('should use correct df command for Unix systems', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      const mockDfOutput = '/dev/sda1 1000000000000 500000000000 500000000000 50% /';
      mockExecAsync.mockResolvedValue({ stdout: mockDfOutput });

      await diskMonitor.getDiskUsage();

      expect(mockExecAsync).toHaveBeenCalledWith('df -B1 / | tail -1');
    });
  });
});