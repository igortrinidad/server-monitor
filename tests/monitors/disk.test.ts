import { DiskMonitor } from '../../src/monitors/disk';
import { exec } from 'child_process';
import * as os from 'os';

// Mock dependencies
jest.mock('child_process');
jest.mock('os');

const mockExec = exec as jest.MockedFunction<typeof exec>;
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
      
      // Mock df command output
      const mockDfOutput = 'Filesystem     Size  Used Avail Use% Mounted on\n/dev/disk1s1   500G  350G  150G  70% /';
      
      // Mock du command output
      const mockDuOutput = `350G\t/System
150G\t/Applications
100G\t/Users
50G\t/Library
25G\t/private`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        // Add small delay to simulate async behavior
        setTimeout(() => {
          if (command.includes('df -h')) {
            callback(null, { stdout: mockDfOutput });
          } else if (command.includes('du -sh')) {
            callback(null, { stdout: mockDuOutput });
          } else {
            callback(new Error('Unknown command'));
          }
        }, 1);
      });

      const result = await diskMonitor.getDiskUsage();

      expect(result.total).toBeGreaterThan(0);
      expect(result.used).toBeGreaterThan(0);
      expect(result.free).toBeGreaterThan(0);
      expect(result.percentage).toBeGreaterThan(0);
      expect(result.topFolders).toHaveLength(5);
      expect(result.topFolders[0].path).toBe('/System');
    });

    it('should return correct disk usage for Windows systems', async () => {
      mockOs.platform.mockReturnValue('win32');
      
      // Mock wmic command output
      const mockWmicOutput = `FreeSpace=161061273600

Size=500107862016`;

      // Mock dir command output (simplified)
      const mockDirOutput = `Directory of C:\\
01/01/2023  01:00 AM    <DIR>          Program Files
01/01/2023  01:00 AM    <DIR>          Windows
               2 File(s)  536,870,912 bytes
               2 Dir(s)   161,061,273,600 bytes free`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        setTimeout(() => {
          if (command.includes('wmic logicaldisk')) {
            callback(null, { stdout: mockWmicOutput });
          } else if (command.includes('dir C:\\')) {
            callback(null, { stdout: mockDirOutput });
          } else {
            callback(new Error('Unknown command'));
          }
        }, 1);
      });

      const result = await diskMonitor.getDiskUsage();

      expect(result.total).toBe(500107862016);
      expect(result.free).toBe(161061273600);
      expect(result.used).toBe(500107862016 - 161061273600);
      expect(result.percentage).toBeCloseTo(67.8, 1);
    });

    it('should handle exec command errors gracefully', async () => {
      mockOs.platform.mockReturnValue('darwin');
      
      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(new Error('Command failed'));
      });

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
      
      const mockDfOutput = 'Filesystem     Size  Used Avail Use% Mounted on\n/dev/sda1      1.5T  800G  700G  53% /';
      const mockDuOutput = `1.2T\t/home
500G\t/var
200G\t/usr
100M\t/boot
50K\t/tmp`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        if (command.includes('df -h')) {
          callback(null, { stdout: mockDfOutput });
        } else if (command.includes('du -sh')) {
          callback(null, { stdout: mockDuOutput });
        }
      });

      const result = await diskMonitor.getDiskUsage();

      // Check that sizes were parsed correctly (T = TB, G = GB, M = MB, K = KB)
      expect(result.total).toBeCloseTo(1.5 * 1024 * 1024 * 1024 * 1024, -9); // 1.5TB
      expect(result.used).toBeCloseTo(800 * 1024 * 1024 * 1024, -6); // 800GB
      expect(result.free).toBeCloseTo(700 * 1024 * 1024 * 1024, -6); // 700GB
      
      // Check folder parsing
      const homeFolder = result.topFolders.find(f => f.path === '/home');
      expect(homeFolder?.size).toBeCloseTo(1.2 * 1024 * 1024 * 1024 * 1024, -9); // 1.2TB
    });

    it('should calculate folder percentages correctly', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      const mockDfOutput = 'Filesystem     Size  Used Avail Use% Mounted on\n/dev/sda1      100G   50G   50G  50% /';
      const mockDuOutput = `30G\t/home
15G\t/var
5G\t/usr`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        if (command.includes('df -h')) {
          callback(null, { stdout: mockDfOutput });
        } else if (command.includes('du -sh')) {
          callback(null, { stdout: mockDuOutput });
        }
      });

      const result = await diskMonitor.getDiskUsage();

      // Total folder size: 30 + 15 + 5 = 50GB
      // Percentages should be: 60%, 30%, 10%
      const homeFolder = result.topFolders.find(f => f.path === '/home');
      const varFolder = result.topFolders.find(f => f.path === '/var');
      const usrFolder = result.topFolders.find(f => f.path === '/usr');

      expect(homeFolder?.percentage).toBeCloseTo(60, 1);
      expect(varFolder?.percentage).toBeCloseTo(30, 1);
      expect(usrFolder?.percentage).toBeCloseTo(10, 1);
    });

    it('should return empty folders for unsupported platforms', async () => {
      mockOs.platform.mockReturnValue('sunos' as any);
      
      const result = await diskMonitor.getDiskUsage();

      expect(result.topFolders).toEqual([]);
    });

    it('should limit folders to top 20', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      const mockDfOutput = 'Filesystem     Size  Used Avail Use% Mounted on\n/dev/sda1      100G   50G   50G  50% /';
      
      // Generate 25 folders
      let mockDuOutput = '';
      for (let i = 1; i <= 25; i++) {
        mockDuOutput += `${i}G\t/folder${i}\n`;
      }

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        if (command.includes('df -h')) {
          callback(null, { stdout: mockDfOutput });
        } else if (command.includes('du -sh')) {
          callback(null, { stdout: mockDuOutput });
        }
      });

      const result = await diskMonitor.getDiskUsage();

      expect(result.topFolders).toHaveLength(20);
    });

    it('should handle malformed df output', async () => {
      mockOs.platform.mockReturnValue('linux');
      
      const mockDfOutput = 'Malformed output without proper columns';
      const mockDuOutput = `10G\t/home`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        if (command.includes('df -h')) {
          callback(null, { stdout: mockDfOutput });
        } else if (command.includes('du -sh')) {
          callback(null, { stdout: mockDuOutput });
        }
      });

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
});