import { PM2Monitor } from '../../src/monitors/pm2';
import { exec } from 'child_process';

// Mock dependencies
jest.mock('child_process');

const mockExec = exec as jest.MockedFunction<typeof exec>;

describe('PM2Monitor', () => {
  let pm2Monitor: PM2Monitor;

  beforeEach(() => {
    pm2Monitor = new PM2Monitor();
    jest.clearAllMocks();
  });

  describe('getPM2Processes', () => {
    it('should return PM2 processes when PM2 is available', async () => {
      const mockPM2Output = JSON.stringify([
        {
          name: 'app1',
          pid: 1234,
          pm2_env: {
            status: 'online',
            pm_uptime: Date.now() - 3600000 // 1 hour ago
          },
          monit: {
            cpu: 15.5,
            memory: 134217728 // 128MB
          }
        },
        {
          name: 'app2',
          pid: 5678,
          pm2_env: {
            status: 'stopped',
            pm_uptime: Date.now() - 7200000, // 2 hours ago
            restart_time: 3
          },
          monit: {
            cpu: 0,
            memory: 0
          }
        }
      ]);

      (mockExec as any)
        .mockImplementationOnce((command: string, callback: Function) => {
          // Mock 'which pm2' command
          callback(null, { stdout: '/usr/local/bin/pm2' });
        })
        .mockImplementationOnce((command: string, callback: Function) => {
          // Mock 'pm2 jlist' command
          callback(null, { stdout: mockPM2Output });
        });

      const result = await pm2Monitor.getPM2Processes();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'app1',
        pid: 1234,
        status: 'online',
        cpu: 15.5,
        memory: 134217728,
        uptime: expect.stringMatching(/\d+h \d+m/),
        restarts: 0
      });
      expect(result[1]).toEqual({
        name: 'app2',
        pid: 5678,
        status: 'stopped',
        cpu: 0,
        memory: 0,
        uptime: expect.stringMatching(/\d+h \d+m/),
        restarts: 3
      });
    });

    it('should return empty array when PM2 is not installed', async () => {
      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        // Mock 'which pm2' command failing
        callback(new Error('PM2 not found'));
      });

      const result = await pm2Monitor.getPM2Processes();

      expect(result).toEqual([]);
    });

    it('should handle malformed PM2 JSON output', async () => {
      (mockExec as any)
        .mockImplementationOnce((command: string, callback: Function) => {
          // Mock 'which pm2' command
          callback(null, { stdout: '/usr/local/bin/pm2' });
        })
        .mockImplementationOnce((command: string, callback: Function) => {
          // Mock 'pm2 jlist' with invalid JSON
          callback(null, { stdout: 'invalid json' });
        });

      const result = await pm2Monitor.getPM2Processes();

      expect(result).toEqual([]);
    });

    it('should handle missing process properties gracefully', async () => {
      const mockPM2Output = JSON.stringify([
        {
          // Missing most properties
          name: 'incomplete-app'
        },
        {
          name: 'partial-app',
          pid: 9999,
          pm2_env: {
            status: 'online'
            // Missing pm_uptime and restart_time
          }
          // Missing monit
        }
      ]);

      (mockExec as any)
        .mockImplementationOnce((command: string, callback: Function) => {
          callback(null, { stdout: '/usr/local/bin/pm2' });
        })
        .mockImplementationOnce((command: string, callback: Function) => {
          callback(null, { stdout: mockPM2Output });
        });

      const result = await pm2Monitor.getPM2Processes();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'incomplete-app',
        pid: 0,
        status: 'unknown',
        cpu: 0,
        memory: 0,
        uptime: '0s',
        restarts: 0
      });
      expect(result[1]).toEqual({
        name: 'partial-app',
        pid: 9999,
        status: 'online',
        cpu: 0,
        memory: 0,
        uptime: '0s',
        restarts: 0
      });
    });

    it('should format uptime correctly for different durations', async () => {
      const now = Date.now();
      const mockPM2Output = JSON.stringify([
        {
          name: 'app-seconds',
          pm2_env: { pm_uptime: now - 30000 }, // 30 seconds
          monit: {}
        },
        {
          name: 'app-minutes',
          pm2_env: { pm_uptime: now - 150000 }, // 2.5 minutes
          monit: {}
        },
        {
          name: 'app-hours',
          pm2_env: { pm_uptime: now - 7200000 }, // 2 hours
          monit: {}
        },
        {
          name: 'app-days',
          pm2_env: { pm_uptime: now - 172800000 }, // 2 days
          monit: {}
        }
      ]);

      (mockExec as any)
        .mockImplementationOnce((command: string, callback: Function) => {
          callback(null, { stdout: '/usr/local/bin/pm2' });
        })
        .mockImplementationOnce((command: string, callback: Function) => {
          callback(null, { stdout: mockPM2Output });
        });

      const result = await pm2Monitor.getPM2Processes();

      expect(result[0].uptime).toMatch(/30s/);
      expect(result[1].uptime).toMatch(/2m 30s/);
      expect(result[2].uptime).toMatch(/2h 0m/);
      expect(result[3].uptime).toMatch(/2d 0h/);
    });
  });

  describe('getPM2Logs', () => {
    it('should return logs for all apps when no app name provided', async () => {
      const mockLogsOutput = `2023-10-22T10:00:00: PM2 log from app1
2023-10-22T10:01:00: PM2 log from app2
2023-10-22T10:02:00: Error in app1`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        expect(command).toContain('pm2 logs --lines 100 --nostream');
        callback(null, { stdout: mockLogsOutput });
      });

      const result = await pm2Monitor.getPM2Logs();

      expect(result).toBe(mockLogsOutput);
    });

    it('should return logs for specific app when app name provided', async () => {
      const mockLogsOutput = `2023-10-22T10:00:00: PM2 log from myapp
2023-10-22T10:01:00: Another log from myapp`;

      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        expect(command).toContain('pm2 logs myapp --lines 50 --nostream');
        callback(null, { stdout: mockLogsOutput });
      });

      const result = await pm2Monitor.getPM2Logs('myapp', 50);

      expect(result).toBe(mockLogsOutput);
    });

    it('should return empty string when PM2 logs command fails', async () => {
      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(new Error('PM2 logs failed'));
      });

      const result = await pm2Monitor.getPM2Logs();

      expect(result).toBe('');
    });

    it('should use default line count when not specified', async () => {
      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        expect(command).toContain('--lines 100');
        callback(null, { stdout: 'logs' });
      });

      await pm2Monitor.getPM2Logs('myapp');
    });

    it('should handle empty logs output', async () => {
      (mockExec as any).mockImplementation((command: string, callback: Function) => {
        callback(null, { stdout: '' });
      });

      const result = await pm2Monitor.getPM2Logs();

      expect(result).toBe('');
    });
  });

  describe('formatUptime', () => {
    it('should format various uptime durations correctly', async () => {
      const now = Date.now();
      
      // Test by creating processes with different uptimes
      const testCases = [
        { uptime: 0, expected: '0s' },
        { uptime: now - 5000, expected: '5s' },
        { uptime: now - 65000, expected: '1m 5s' },
        { uptime: now - 3665000, expected: '1h 1m' },
        { uptime: now - 90061000, expected: '1d 1h' }
      ];

      for (const testCase of testCases) {
        const mockPM2Output = JSON.stringify([{
          name: 'test-app',
          pm2_env: { pm_uptime: testCase.uptime },
          monit: {}
        }]);

        (mockExec as any)
          .mockImplementationOnce((command: string, callback: Function) => {
            callback(null, { stdout: '/usr/local/bin/pm2' });
          })
          .mockImplementationOnce((command: string, callback: Function) => {
            callback(null, { stdout: mockPM2Output });
          });

        const result = await pm2Monitor.getPM2Processes();
        expect(result[0].uptime).toBe(testCase.expected);
      }
    });
  });
});